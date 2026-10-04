import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError,loadService } from './helpers/load-service.mjs';
const session={user:{id:'user-a'},token:'synthetic-token'};
const input={fromCurrency:'PLN',toCurrency:'EUR',amount:'100.00',expectedRate:'5'};
test('normalizacja kwot: przecinek, kropka, duże liczby i błędne wartości',async()=>{
 const {service}=await loadService('deposit-service');
 for(const [value,expected]of [[' 10 ','10.00'],['1,5','1.50'],['0.01','0.01'],['99999999999999999.99','99999999999999999.99']])assert.equal(service.normalizeAmount(value),expected);
 for(const value of ['0','0.00','-1','01','1.001','1e2','NaN','100000000000000000'])assert.throws(()=>service.normalizeAmount(value));
});
test('wpłata jest zapisana przed wysłaniem, a niepewny wynik zachowuje identyfikator do ponowienia',async()=>{
 const storage=new Map();let attempt=0;const ids=[];
 const {service}=await loadService('deposit-service',{storage,apiRequest:async(path,options)=>{
  assert.equal(path,'/wallet/deposits');assert.ok(storage.size);ids.push(options.requestId);
  if(attempt++===0)throw new Error('network');return {deposit:{id:'deposit-1',amount:'100.00'}};
 }});
 await assert.rejects(service.submitDeposit(session,'100.00'),/network/);assert.equal(storage.size,1);
 await assert.rejects(service.submitDeposit(session,'101.00'),/wcześniejszą kwotą/);assert.equal(ids.length,1);
 const result=await service.submitDeposit(session,'100.00');assert.equal(result.id,'deposit-1');assert.equal(ids[0],ids[1]);assert.equal(storage.size,0);
});
test('błąd zapisu lokalnego blokuje wysłanie wpłaty',async()=>{
 const {service,calls}=await loadService('deposit-service',{write:async()=>{throw new Error('storage');}});
 await assert.rejects(service.submitDeposit(session,'10.00'),/storage/);assert.equal(calls.length,0);
});
test('odrzucenie wpłaty 400 usuwa oczekiwanie, niepewny błąd serwera je zachowuje',async()=>{
 for(const status of [400,500,401]){
  const {service,storage}=await loadService('deposit-service',{apiRequest:async()=>{throw new ApiError('rejected',status);}});
  await assert.rejects(service.submitDeposit(session,'10.00'));assert.equal(storage.size,status===400?0:1);
 }
});
test('utrata potwierdzenia lub błąd usunięcia lokalnego nie tworzy nowego żądania',async()=>{
 let fail=true;const ids=[];
 const {service}=await loadService('deposit-service',{remove:async()=>{if(fail){fail=false;throw new Error('delete failed');}},apiRequest:async(path,options)=>{ids.push(options.requestId);return {deposit:{id:'same-deposit'}};}});
 await assert.rejects(service.submitDeposit(session,'10.00'),/delete failed/);
 assert.equal((await service.submitDeposit(session,'10.00')).id,'same-deposit');assert.equal(ids[0],ids[1]);
});
test('wymiana zachowuje żądanie po awarii i blokuje zmianę jego parametrów',async()=>{
 let fail=true;const ids=[];
 const {service,storage}=await loadService('exchange-service',{apiRequest:async(path,options)=>{assert.equal(path,'/exchange');assert.ok(storage.size);ids.push(options.requestId);if(fail){fail=false;throw new Error('network');}return {exchange:{id:'exchange-1'}};}});
 await assert.rejects(service.submitExchange(session,input),/network/);
 await assert.rejects(service.submitExchange(session,{...input,expectedRate:'6'}),/oczekującej wymiany/);assert.equal(ids.length,1);
 assert.equal((await service.submitExchange(session,input)).id,'exchange-1');assert.equal(ids[0],ids[1]);assert.equal(storage.size,0);
});
test('definitywnie odrzucona wymiana usuwa oczekiwanie, 503 i konflikt je zachowują',async()=>{
 for(const [status,code,remaining]of [[400,null,0],[409,'EXCHANGE_RATE_CHANGED',0],[409,'INSUFFICIENT_FUNDS',0],[404,'WALLET_NOT_FOUND',0],[503,'RATES_UNAVAILABLE',1],[409,'EXCHANGE_REQUEST_CONFLICT',1]]){
  const {service,storage}=await loadService('exchange-service',{apiRequest:async()=>{throw new ApiError('rejected',status,[],code);}});
  await assert.rejects(service.submitExchange(session,input));assert.equal(storage.size,remaining);
 }
});
test('oczekujące operacje są rozdzielone między kontami i uszkodzony zapis blokuje wysłanie',async()=>{
 const {service,storage,calls}=await loadService('exchange-service',{apiRequest:async()=>{throw new Error('network');}});
 await assert.rejects(service.submitExchange(session,input));
 assert.equal(await service.getPendingExchange('user-b'),null);
 storage.set('kantor.pending-exchange.user-b','invalid JSON');
 await assert.rejects(service.submitExchange({...session,user:{id:'user-b'}},input));assert.equal(calls.length,1);
});
