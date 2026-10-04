import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import { pool } from '../src/db/pool.js';

// NBP zastępujemy danymi syntetycznymi: testy nie pobierają ani nie zapisują archiwum NBP.
test('operacje finansowe i scenariusze awarii', {skip:process.env.FINANCIAL_INTEGRATION!=='1'}, async t=>{
 const nativeFetch=globalThis.fetch;
 let mode='ok',ask=5,nbpCalls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(!String(url).startsWith('https://api.nbp.pl/'))return nativeFetch(url,options);
  nbpCalls++;
  if(mode==='network')throw new TypeError('synthetic network error');
  if(mode==='timeout')throw new DOMException('synthetic timeout','TimeoutError');
  if(mode==='unavailable')return {ok:false,status:503};
  if(mode==='missing')return {ok:false,status:404};
  if(mode==='malformed')return {ok:true,status:200,json:async()=>[{table:'C',rates:[]}]};
  return {ok:true,status:200,json:async()=>[{table:'C',no:mode==='insert-failure'?'x'.repeat(51):'synthetic-test',effectiveDate:'2024-01-05',rates:[{code:'EUR',currency:'synthetic EUR',bid:4,ask},{code:'USD',currency:'synthetic USD',bid:3,ask:4},{code:'GBP',currency:'synthetic GBP',bid:5,ask:6}]}]};
 });
 const server=app.listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 const base=`http://127.0.0.1:${server.address().port}`,users=[];
 async function req(path,{token,method='GET',body,key}={}){
  const response=await nativeFetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:response.status===204?null:await response.json()};
 }
 async function user(funds='0.00'){
  mode='ok';ask=5;
  const credentials={email:`finance-${randomUUID()}@example.invalid`,password:'TestPassword123!'};
  const registered=await req('/auth/register',{method:'POST',body:{...credentials,firstName:'Test',lastName:'Finance'}});assert.equal(registered.status,201);users.push(registered.data.user.id);
  const login=await req('/auth/login',{method:'POST',body:credentials});assert.equal(login.status,200);
  const token=login.data.token;
  const wallet=(await pool.query('SELECT id FROM portfele WHERE uzytkownik_id=$1',[registered.data.user.id])).rows[0].id;
  if(funds!=='0.00')assert.equal((await deposit(token,funds)).status,201);
  return {token,id:registered.data.user.id,wallet};
 }
 const deposit=(token,amount,key=randomUUID())=>req('/wallet/deposits',{token,method:'POST',body:{amount},key});
 const exchange=(token,body={},key=randomUUID())=>req('/exchange',{token,method:'POST',key,body:{fromCurrency:'PLN',toCurrency:'EUR',amount:'100.00',expectedRate:'5',...body}});
 async function balances(token){const r=await req('/wallet',{token});assert.equal(r.status,200);return Object.fromEntries(r.data.wallet.balances.map(b=>[b.currency,b.amount]));}
 async function count(wallet,table='transakcje'){return (await pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE portfel_id=$1`,[wallet])).rows[0].count;}
 try{
  await t.test('rejestracja tworzy cztery salda, hasło jest haszowane, dostęp wymaga sesji',async()=>{
   const u=await user();assert.deepEqual(await balances(u.token),{EUR:'0.00',GBP:'0.00',PLN:'0.00',USD:'0.00'});
   const hash=(await pool.query('SELECT skrot_hasla FROM uzytkownicy WHERE id=$1',[u.id])).rows[0].skrot_hasla;assert.match(hash,/^\$argon2id\$/);
   for(const path of ['/wallet','/exchange/history','/rates','/history'])assert.equal((await req(path)).status,401);
   assert.equal((await req('/wallet',{token:'invalid'})).status,401);
  });
  await t.test('równoczesne ponowienia wpłaty zwiększają saldo tylko raz',async()=>{
   const u=await user(),key=randomUUID();const results=await Promise.all([deposit(u.token,'100.00',key),deposit(u.token,'100.00',key),deposit(u.token,'100.00',key)]);
   assert.deepEqual(results.map(r=>r.status).sort(),[200,200,201]);assert.equal(new Set(results.map(r=>r.data.deposit.id)).size,1);
   assert.equal((await balances(u.token)).PLN,'100.00');assert.equal(await count(u.wallet,'wplaty'),1);
   assert.equal((await deposit(u.token,'101.00',key)).status,409);assert.equal((await balances(u.token)).PLN,'100.00');
  });
  await t.test('walidacja wpłat i wymian odrzuca błędne dane bez zmian sald',async()=>{
   const u=await user('100.00'),before=await balances(u.token);
   for(const amount of ['0.00','-1.00','1.001',100])assert.equal((await deposit(u.token,amount)).status,400);
   assert.equal((await req('/wallet/deposits',{token:u.token,method:'POST',body:{amount:'10.00'},key:'bad'})).status,400);
   assert.equal((await exchange(u.token,{fromCurrency:'EUR',toCurrency:'USD'})).status,400);
   assert.equal((await exchange(u.token,{userId:randomUUID()})).status,400);
   assert.equal((await exchange(u.token,{expectedRate:'0'})).status,400);
   assert.deepEqual(await balances(u.token),before);assert.equal(await count(u.wallet),0);
  });
  await t.test('kupno i sprzedaż aktualizują obie waluty i zapisują rzeczywisty kurs',async()=>{
   const u=await user('1000.00');const buy=await exchange(u.token);assert.equal(buy.status,201);assert.equal(buy.data.exchange.targetAmount,'20.00');assert.equal(buy.data.exchange.rateType,'ask');
   const sell=await exchange(u.token,{fromCurrency:'EUR',toCurrency:'PLN',amount:'10.00',expectedRate:'4'});assert.equal(sell.status,201);assert.equal(sell.data.exchange.targetAmount,'40.00');assert.equal(sell.data.exchange.rateType,'bid');
   const b=await balances(u.token);assert.equal(b.PLN,'940.00');assert.equal(b.EUR,'10.00');assert.equal(await count(u.wallet),2);
  });
  await t.test('równoczesne ponowienia wymiany wykonują ją raz, konflikt danych jest odrzucany',async()=>{
   const u=await user('1000.00'),key=randomUUID(),calls=nbpCalls;
   const results=await Promise.all([exchange(u.token,{},key),exchange(u.token,{},key),exchange(u.token,{},key)]);
   assert.deepEqual(results.map(r=>r.status).sort(),[200,200,201]);assert.equal(new Set(results.map(r=>r.data.exchange.id)).size,1);assert.equal(nbpCalls-calls,1);
   assert.equal((await balances(u.token)).PLN,'900.00');assert.equal(await count(u.wallet),1);
   assert.equal((await exchange(u.token,{amount:'101.00'},key)).status,409);
   assert.equal((await exchange(u.token,{expectedRate:'6'},key)).status,409);
  });
  await t.test('konkurujące wymiany nie mogą przekroczyć dostępnych środków',async()=>{
   const u=await user('100.00');const results=await Promise.all([exchange(u.token,{amount:'80.00'}),exchange(u.token,{amount:'80.00'})]);
   assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409).data.code,'INSUFFICIENT_FUNDS');
   const b=await balances(u.token);assert.equal(b.PLN,'20.00');assert.equal(b.EUR,'16.00');assert.equal(await count(u.wallet),1);
  });
  await t.test('wpłata i wymiana równocześnie nie tracą aktualizacji salda',async()=>{
   const u=await user('100.00');const results=await Promise.all([deposit(u.token,'50.00'),exchange(u.token)]);assert.ok(results.every(r=>r.status===201));
   const b=await balances(u.token);assert.equal(b.PLN,'50.00');assert.equal(b.EUR,'20.00');
  });
  await t.test('brak środków i zmiana kursu odrzucają operację bez zapisu historii',async()=>{
   const u=await user('100.00'),before=await balances(u.token);
   assert.equal((await exchange(u.token,{amount:'200.00'})).data.code,'INSUFFICIENT_FUNDS');
   ask=6;assert.equal((await exchange(u.token)).data.code,'EXCHANGE_RATE_CHANGED');
   assert.deepEqual(await balances(u.token),before);assert.equal(await count(u.wallet),0);
  });
  await t.test('awarie, timeout i nieprawidłowe dane NBP nie zmieniają sald',async()=>{
   const u=await user('100.00'),before=await balances(u.token);
   for(const failure of ['network','timeout','unavailable','malformed']){
    mode=failure;const r=await exchange(u.token);assert.equal(r.status,503);assert.equal(r.data.code,'RATES_UNAVAILABLE');assert.deepEqual(await balances(u.token),before);assert.equal(await count(u.wallet),0);
   }
  });
  await t.test('błąd po obciążeniu źródła wycofuje zmianę salda',async()=>{
   const u=await user('100.00');await pool.query("DELETE FROM salda_walut WHERE portfel_id=$1 AND kod_waluty='EUR'",[u.wallet]);
   assert.equal((await exchange(u.token)).status,500);assert.equal((await balances(u.token)).PLN,'100.00');assert.equal(await count(u.wallet),0);
  });
  await t.test('błąd zapisu historii wycofuje obie wcześniejsze zmiany sald',async()=>{
   const u=await user('100.00'),before=await balances(u.token);mode='insert-failure';
   assert.equal((await exchange(u.token)).status,500);assert.deepEqual(await balances(u.token),before);assert.equal(await count(u.wallet),0);
  });
  await t.test('historia i ponowienie zachowują kurs nawet po zmianie NBP lub awarii',async()=>{
   const u=await user('100.00'),key=randomUUID();const original=await exchange(u.token,{},key);assert.equal(original.status,201);
   ask=6;const history=await req('/exchange/history',{token:u.token});assert.deepEqual(history.data.exchanges[0],original.data.exchange);
   mode='network';const calls=nbpCalls,repeated=await exchange(u.token,{},key);assert.equal(repeated.status,200);assert.deepEqual(repeated.data.exchange,original.data.exchange);assert.equal(nbpCalls,calls);assert.equal(await count(u.wallet),1);
  });
  await t.test('dane i operacje są izolowane pomiędzy użytkownikami',async()=>{
   const a=await user('100.00'),b=await user(),key=randomUUID();assert.equal((await exchange(a.token,{},key)).status,201);
   assert.equal((await exchange(b.token,{},key)).data.code,'INSUFFICIENT_FUNDS');assert.equal((await balances(b.token)).PLN,'0.00');assert.equal((await balances(b.token)).EUR,'0.00');
   assert.equal((await req('/exchange/history',{token:b.token})).data.exchanges.length,0);
   assert.equal((await req('/auth/logout',{token:b.token,method:'POST'})).status,204);assert.equal((await req('/wallet',{token:b.token})).status,401);
  });
  await t.test('archiwum waliduje daty i rozróżnia brak tabeli od awarii',async()=>{
   const u=await user();assert.equal((await req('/rates/historical?date=2024-01-05',{token:u.token})).status,200);
   for(const date of ['2024-02-30','1900-01-01','2999-01-01','wrong'])assert.equal((await req('/rates/historical?date='+date,{token:u.token})).status,400);
   mode='missing';assert.equal((await req('/rates/historical?date=2024-01-06',{token:u.token})).status,404);
   mode='network';assert.equal((await req('/rates/historical?date=2024-01-05',{token:u.token})).status,503);
  });
 }finally{
  for(const table of ['transakcje','wplaty','salda_walut'])await pool.query(`DELETE FROM ${table} WHERE portfel_id IN(SELECT id FROM portfele WHERE uzytkownik_id=ANY($1::uuid[]))`,[users]);
  await pool.query('DELETE FROM portfele WHERE uzytkownik_id=ANY($1::uuid[])',[users]);await pool.query('DELETE FROM uzytkownicy WHERE id=ANY($1::uuid[])',[users]);
  await new Promise(resolve=>server.close(resolve));await pool.end();
 }
});
