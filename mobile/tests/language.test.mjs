import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { decimal, english, getLocale, setLanguageValue, t } from '../src/i18n/translations.js';
const require=createRequire(import.meta.url),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
test('język: interfejs, błędy, dynamiczne rodzaje operacji i format dat',()=>{
 setLanguageValue('en');
 assert.equal(t('Portfel'),'Wallet');assert.equal(t('Kupno EUR'),'Buy EUR');assert.equal(t('Sprzedaż USD'),'Sell USD');
 assert.equal(t('Wymienisz 10 PLN na 2 EUR.'),'Exchange 10 PLN for 2 EUR.');
 assert.equal(t('Potwierdzono wpłatę 10 PLN.'),'Deposit of 10 PLN confirmed.');
 assert.equal(t(' Kurs '),' Rate ');
 assert.equal(t('Pole nie może być puste.\nMaksymalna długość to 100 znaków.'),'This field cannot be empty.\nMaximum length is 100 characters.');
 assert.equal(t('192/C/NBP/2026'),'192/C/NBP/2026');assert.equal(getLocale(),'en-GB');
 assert.equal(decimal('12345678912345678.01'), '12345678912345678.01');
 setLanguageValue('pl');assert.equal(t('Portfel'),'Portfel');assert.equal(getLocale(),'pl-PL');
 assert.equal(decimal('12345678912345678.01'), '12345678912345678,01');
});
test('statyczne polskie etykiety JSX mają tłumaczenie',()=>{
 const missing=[];
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(file.endsWith('.js'))traverse(parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']}),{JSXText(p){const value=p.node.value.replace(/\s+/g,' ').trim();if(value&&/[ąćęłńóśźż]|^[A-Za-z ]+$/.test(value)&&!english[value]&&!['PLN','→'].includes(value))missing.push(`${file}: ${value}`);}});}}
 walk(new URL('../src',import.meta.url).pathname);assert.deepEqual(missing,[]);
});
