import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExchange } from '../src/modules/exchange/exchange.calculator.js';
import { exchangeSchema, executeExchangeSchema } from '../src/modules/exchange/exchange.schema.js';
import { depositSchema } from '../src/modules/wallet/wallet.schema.js';
const ratesTable = { tableNumber:'synthetic-test', effectiveDate:'2024-01-05', rates:[{currency:'EUR',bid:'4',ask:'5'},{currency:'USD',bid:'1.005',ask:'2'},{currency:'GBP',bid:'5',ask:'6'}] };
const calculate = (input, table=ratesTable) => calculateExchange({ fromCurrency:'PLN',toCurrency:'EUR',amount:'100.00',...input,ratesTable:table });
test('kupno używa ask, sprzedaż bid, a wynik zachowuje dane zastosowanego kursu',()=>{
 const buy=calculate({});assert.equal(buy.targetAmount,'20.00');assert.equal(buy.rateType,'ask');assert.equal(buy.exchangeRate,'5');assert.equal(buy.tableNumber,'synthetic-test');
 const sell=calculate({fromCurrency:'EUR',toCurrency:'PLN',amount:'10.00'});assert.equal(sell.targetAmount,'40.00');assert.equal(sell.rateType,'bid');
});
test('zaokrąglanie HALF_UP i duże kwoty zachowują dokładność dziesiętną',()=>{
 assert.equal(calculate({fromCurrency:'USD',toCurrency:'PLN',amount:'1.00'}).targetAmount,'1.01');
 assert.equal(calculate({toCurrency:'GBP',amount:'1.00'}).targetAmount,'0.17');
 const table={...ratesTable,rates:[{currency:'EUR',bid:'1',ask:'1'}]};
 assert.equal(calculate({amount:'99999999999999999.99'},table).targetAmount,'99999999999999999.99');
});
test('zbyt małe i zbyt duże wyniki mają kod błędu obsługiwany przez API',()=>{
 assert.throws(()=>calculate({amount:'0.01'}),{code:'EXCHANGE_AMOUNT_TOO_SMALL'});
 assert.throws(()=>calculate({fromCurrency:'EUR',toCurrency:'PLN',amount:'99999999999999999.99'}),{code:'EXCHANGE_AMOUNT_TOO_LARGE'});
});
test('kalkulator odrzuca błędne dane i nie zmienia wejściowej tabeli',()=>{
 const before=JSON.stringify(ratesTable);
 for(const amount of ['0.00','-1.00','1.001','1e2','NaN',100])assert.throws(()=>calculate({amount}));
 assert.throws(()=>calculate({fromCurrency:'EUR',toCurrency:'USD'}));
 assert.throws(()=>calculate({}, {...ratesTable,rates:[]}));
 assert.throws(()=>calculate({}, {...ratesTable,rates:[{currency:'EUR',ask:'0'}]}));
 calculate({});assert.equal(JSON.stringify(ratesTable),before);
});
test('schematy odrzucają manipulację parametrami, nieobsługiwane pary i kwoty',()=>{
 const base={fromCurrency:'PLN',toCurrency:'EUR',amount:'100.00'};
 assert.equal(exchangeSchema.safeParse(base).success,true);
 for(const amount of ['0.00','-1.00','1,00','1.001',100,'100000000000000000.00'])assert.equal(depositSchema.safeParse({amount}).success,false);
 assert.equal(exchangeSchema.safeParse({...base,fromCurrency:'EUR',toCurrency:'USD'}).success,false);
 assert.equal(exchangeSchema.safeParse({...base,userId:'other'}).success,false);
 for(const expectedRate of ['0','-1','NaN','1.123456789',1])assert.equal(executeExchangeSchema.safeParse({...base,expectedRate}).success,false);
});
