import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApi } from './helpers/load-service.mjs';
const response=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>body});
test('API przekazuje token, klucz ponowienia i dane JSON, normalizuje adres',async()=>{
 let seen;const api=await loadApi({apiUrl:'http://test.invalid///',fetch:async(url,options)=>{seen={url,options};return response(201,'{"id":"created"}');}});
 assert.equal((await api.apiRequest('/operation',{method:'POST',token:'token',requestId:'key',body:{amount:'10.00'}})).id,'created');
 assert.equal(seen.url,'http://test.invalid/operation');assert.equal(seen.options.headers.Authorization,'Bearer token');assert.equal(seen.options.headers['Idempotency-Key'],'key');assert.equal(seen.options.headers['Content-Type'],'application/json');assert.equal(seen.options.body,'{"amount":"10.00"}');
 assert.ok(seen.options.signal instanceof AbortSignal);
});
test('API zachowuje status, kod i szczegóły błędu serwera',async()=>{
 const api=await loadApi({fetch:async()=>response(409,'{"error":"rate changed","code":"EXCHANGE_RATE_CHANGED","details":[{"field":"rate"}]}')});
 await assert.rejects(api.apiRequest('/operation'),e=>e instanceof api.ApiError&&e.status===409&&e.code==='EXCHANGE_RATE_CHANGED'&&e.details[0].field==='rate');
});
test('puste 204 jest poprawne, nieprawidłowy JSON i błędy sieci są obsługiwane',async()=>{
 const empty=await loadApi({fetch:async()=>response(204,'')});assert.equal(await empty.apiRequest('/operation'),null);
 const invalid=await loadApi({fetch:async()=>response(200,'<html>error</html>')});await assert.rejects(invalid.apiRequest('/operation'),e=>e instanceof invalid.ApiError);
 const network=await loadApi({fetch:async()=>{throw new TypeError('network');}});await assert.rejects(network.apiRequest('/operation'),/połączyć się z serwerem/);
 const missing=await loadApi({apiUrl:''});await assert.rejects(missing.apiRequest('/operation'),/Brak adresu API/);
});
test('timeout przerywa żądanie i zwalnia timer bez automatycznego ponowienia',async()=>{
 let calls=0,cleared=false,delay;
 const api=await loadApi({setTimeout:(callback,ms)=>{delay=ms;queueMicrotask(callback);return 123;},clearTimeout:id=>{assert.equal(id,123);cleared=true;},fetch:async(url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));}});
 await assert.rejects(api.apiRequest('/operation'),/Przekroczono czas oczekiwania/);assert.equal(delay,15000);assert.equal(calls,1);assert.equal(cleared,true);
});
