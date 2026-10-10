import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoApi,resetDemo} from '../src/demo.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
test('Demo: venda, persistência, idempotência, pagamento, cancelamento e reset',async()=>{
 resetDemo();const s=await demoApi('snapshot');const p=s.products[0];
 const order={id:'sale-demo',terminal:1,items:[{id:p.id,quantity:2,unitPrice:p.price}],payment:{method:'cash',received:1000}};
 const sale=await demoApi('sale',order);assert.equal(sale.payment.change,100);await demoApi('sale',order);assert.equal((await demoApi('snapshot')).products[0].stock,48);
 await assert.rejects(demoApi('sale',{...order,id:'invalid',payment:{method:'pix',received:900,confirmed:false}}));assert.equal((await demoApi('snapshot')).sales.length,1);
 await demoApi('cancel',{id:order.id,reason:'Teste'});assert.equal((await demoApi('snapshot')).products[0].stock,50);
 for(const method of ['pix','credit','debit'])await demoApi('sale',{...order,id:method,payment:{method,received:900,confirmed:true}});
 await demoApi('close',{terminal:1,counted:10000});await assert.rejects(demoApi('sale',{...order,id:'closed'}));resetDemo();assert.equal((await demoApi('snapshot')).sales.length,0);
});
