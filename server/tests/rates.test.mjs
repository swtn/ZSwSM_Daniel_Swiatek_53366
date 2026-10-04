import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentRates, getHistoricalRates } from '../src/modules/rates/rates.service.js';
const table=()=>[{table:'C',no:'synthetic-test',effectiveDate:'2024-01-05',rates:['EUR','USD','GBP'].map(code=>({code,currency:code,bid:4,ask:5}))}];
test('bieżące i archiwalne kursy: poprawne URL, no-store i brak pamięci podręcznej',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>table()};});
 const result=await getCurrentRates();assert.deepEqual(result.rates.map(r=>r.currency),['EUR','USD','GBP']);assert.equal(result.rates[0].bid,'4');
 await getHistoricalRates('2024-01-05');await getHistoricalRates('2024-01-05');assert.equal(calls.length,3);
 assert.match(calls[0].url,/tables\/C\/\?format=json$/);assert.match(calls[1].url,/C\/2024-01-05\//);
 assert.ok(calls.every(c=>c.options.cache==='no-store'&&c.options.signal instanceof AbortSignal));
});
test('brak archiwalnego notowania ma osobny kod, a awarie są odrzucane',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:404}));
 await assert.rejects(getHistoricalRates('2024-01-06'),{code:'RATES_NOT_FOUND'});
 await assert.rejects(getCurrentRates(),/404/);
 globalThis.fetch=async()=>{throw new Error('synthetic network failure');};await assert.rejects(getCurrentRates(),/network failure/);
});
test('nieprawidłowe lub niekompletne dane NBP nie przechodzą walidacji',async t=>{
 let payload=table();t.mock.method(globalThis,'fetch',async()=>({ok:true,status:200,json:async()=>payload}));
 payload[0].rates.pop();await assert.rejects(getCurrentRates());
 payload=table();payload[0].rates[0].ask=3;await assert.rejects(getCurrentRates());
 payload=table();payload[0].rates.push(payload[0].rates[0]);await assert.rejects(getCurrentRates());
 payload=table();payload[0].rates[0].bid=-1;await assert.rejects(getCurrentRates());
 payload=table();payload[0].table='A';await assert.rejects(getCurrentRates());
});
