import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import app from '../src/app.js';
import { pool } from '../src/db/pool.js';
test('historia: filtry, stronicowanie, izolacja; hasła i sesje', {skip:process.env.FEATURES_INTEGRATION!=='1'}, async()=>{
 const server=app.listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 const base=`http://127.0.0.1:${server.address().port}`;const users=[];
 async function req(path,token,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:r.status===204?null:await r.json(),cache:r.headers.get('cache-control')};}
 try{
  const credentials=[],tokens=[];
  for(let i=0;i<2;i++){
   const c={email:`features-${randomUUID()}@example.invalid`,password:'OriginalTest123!'};credentials.push(c);
   const r=await req('/auth/register',null,'POST',{...c,firstName:'Test',lastName:'Features'});assert.equal(r.status,201);users.push(r.data.user.id);
   tokens.push((await req('/auth/login',null,'POST',c)).data.token);
  }
  const [token,other]=tokens;const second=(await req('/auth/login',null,'POST',credentials[0])).data.token;
  const wallet=(await pool.query('SELECT id FROM portfele WHERE uzytkownik_id=$1',[users[0]])).rows[0].id;
  for(let i=0;i<63;i++)await pool.query("INSERT INTO wplaty(portfel_id,identyfikator_zadania,kwota,data_utworzenia)VALUES($1,$2,10,'2024-01-05T12:00:00.123456Z')",[wallet,randomUUID()]);
  for(const [from,to,type]of [['PLN','EUR','ask'],['USD','PLN','bid']])await pool.query("INSERT INTO transakcje(portfel_id,identyfikator_zadania,waluta_zrodlowa,waluta_docelowa,kwota_zrodlowa,kwota_docelowa,kurs,typ_kursu,numer_tabeli,data_kursu,data_utworzenia)VALUES($1,$2,$3,$4,10,20,2,$5,'synthetic-test','2024-01-05','2024-01-05T12:00:00.123456Z')",[wallet,randomUUID(),from,to,type]);
  assert.equal((await req('/history')).status,401);
  const ids=new Set();let cursor=null,pages=0;
  do{const p=await req(`/history?limit=20${cursor?'&cursor='+encodeURIComponent(cursor):''}`,token);assert.equal(p.status,200);assert.equal(p.cache,'no-store');for(const item of p.data.items){assert.equal(ids.has(item.id),false);ids.add(item.id);}cursor=p.data.nextCursor;pages++;}while(cursor);
  assert.equal(ids.size,65);assert.equal(pages,4);assert.equal((await req('/history',other)).data.items.length,0);
  const buy=await req('/history?type=buy&currency=EUR&from=2024-01-05&to=2024-01-05',token);assert.equal(buy.data.items.length,1);const item=buy.data.items[0];
  assert.equal((await req(`/history/buy/${item.id}`,token)).data.item.exchangeRate,'2.00000000');assert.equal((await req(`/history/buy/${item.id}`,other)).status,404);
  assert.equal((await req('/history?type=sell&currency=USD',token)).data.items.length,1);assert.equal((await req('/history?from=2024-01-06',token)).data.items.length,0);
  for(const q of ['from=2024-02-30','from=2024-02-02&to=2024-01-01','limit=0','cursor=bad','currency=ZZZ','unexpected=yes'])assert.equal((await req('/history?'+q,token)).status,400);
  const sessions=(await req('/auth/sessions',token)).data.sessions;assert.equal(sessions.length,2);assert.equal(sessions.filter(s=>s.isCurrent).length,1);
  const remote=sessions.find(s=>!s.isCurrent);assert.equal((await req(`/auth/sessions/${remote.id}`,other,'DELETE')).status,404);
  assert.equal((await req('/auth/password',token,'POST',{currentPassword:'WrongPassword123!',newPassword:'ChangedPassword123!'})).status,403);
  assert.equal((await req('/auth/password',token,'POST',{currentPassword:credentials[0].password,newPassword:'short'})).status,400);
  assert.equal((await req('/auth/password',token,'POST',{currentPassword:credentials[0].password,newPassword:'ChangedPassword123!'})).status,204);
  assert.equal((await req('/auth/me',token)).status,200);assert.equal((await req('/auth/me',second)).status,401);assert.equal((await req('/auth/login',null,'POST',credentials[0])).status,401);
  const fresh=await req('/auth/login',null,'POST',{...credentials[0],password:'ChangedPassword123!'});assert.equal(fresh.status,200);
  const refreshed=(await req('/auth/sessions',token)).data.sessions.find(s=>!s.isCurrent);assert.equal((await req(`/auth/sessions/${refreshed.id}`,token,'DELETE')).status,204);assert.equal((await req('/auth/me',fresh.data.token)).status,401);
  assert.equal((await req('/auth/logout-all',token,'POST',{currentPassword:'WrongPassword123!'})).status,403);assert.equal((await req('/auth/logout-all',token,'POST',{currentPassword:'ChangedPassword123!'})).status,204);
  assert.equal((await req('/auth/me',token)).status,401);assert.equal((await req('/auth/me',other)).status,200);
 }finally{
  for(const table of ['transakcje','wplaty','salda_walut'])await pool.query(`DELETE FROM ${table} WHERE portfel_id IN(SELECT id FROM portfele WHERE uzytkownik_id=ANY($1::uuid[]))`,[users]);
  await pool.query('DELETE FROM portfele WHERE uzytkownik_id=ANY($1::uuid[])',[users]);await pool.query('DELETE FROM uzytkownicy WHERE id=ANY($1::uuid[])',[users]);await new Promise(resolve=>server.close(resolve));await pool.end();
 }
});
