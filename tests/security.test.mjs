import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../server/http.mjs';
import {Store} from '../server/store.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('Operador: nenhuma exposição de custo, perfil fiscal, configuração ou vendas de outro usuário',()=>{
 const s=new Store(':memory:');try{
 s.setup({password:'password-test-123'});const admin=s.login({name:'Marcos',password:'password-test-123'});
 s.addUser(admin,{name:'Ana',password:'password-test-123',role:'operator'});const user=s.login({name:'Ana',password:'password-test-123'});
 const id=s.product(admin,{name:'Produto',price:200,cost:100,stock:10});s.open(admin,{terminal:1,opening:1000});s.open(user,{terminal:2,opening:0});
 const order=(idSale,terminal)=>({id:idSale,terminal,items:[{id,quantity:1,unitPrice:200}],payment:{method:'cash',received:200}});
 s.run(admin,'sale',order('admin-sale',1));const own=order('own-sale',2);
 for(const result of [s.run(user,'sale',own),s.run(user,'sale',own),s.run(user,'saleStatus',{id:'own-sale'})]){assert.equal('cost' in result.items[0],false);assert.equal('profile' in result.items[0],false);assert.equal('fiscal_config' in result,false);assert.equal('request_hash' in result,false)}
 const snap=s.snapshot(user);assert.equal('cost' in snap.products[0],false);assert.deepEqual(snap.settings.catalog.regimes,{});assert.equal(snap.sales.length,1);assert.equal(snap.shifts.find(x=>x.terminal===1).expected,null);
 assert.throws(()=>s.run(user,'saleStatus',{id:'admin-sale'}),/outro operador/);for(const action of ['product','configure','operator','profile','cancel','cashMove'])assert.throws(()=>s.run(user,action,{}),/administrador/);
 assert.equal(s.snapshot(admin).products[0].cost,100);
 }finally{s.shutdown()}
});
test('HTTP: origem, payload, rotação, expiração e limite de login',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'pdv-security-'));let time=Date.now();const app=await startServer({dataDir:dir,port:0,clock:()=>time});const base=`http://127.0.0.1:${app.port}`;let cookie='';
 const request=(body,headers={})=>fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-PDV-Request':'1',Cookie:cookie,...headers},body:JSON.stringify(body)});
 const snapshot=async(c=cookie)=>(await (await fetch(base+'/api/snapshot',{headers:{Cookie:c}})).json()).data;
 try{
 await request({action:'setup',payload:{password:'password-test-123'}});const login={action:'login',payload:{name:'Marcos',password:'password-test-123'}};
 let response=await request(login);cookie=response.headers.get('set-cookie').split(';')[0];const old=cookie;assert.ok((await snapshot()).user);
 response=await request(login);cookie=response.headers.get('set-cookie').split(';')[0];assert.equal((await snapshot(old)).user,null);
 assert.equal((await request({action:'seed'},{Origin:`https://127.0.0.1:${app.port}`})).status,403);
 assert.equal((await request({action:'seed'},{'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await request({action:'product',payload:null})).status,400);
 assert.equal((await request(null)).status,400);
 time+=30*60000;assert.equal((await snapshot()).user,null);
 response=await request(login);cookie=response.headers.get('set-cookie').split(';')[0];for(let i=0;i<16;i++){time+=29*60000;assert.ok((await snapshot()).user)}time+=17*60000;assert.equal((await snapshot()).user,null);
 for(let i=0;i<8;i++)await request({action:'login',payload:{name:'Marcos',password:'incorrect'}});
 assert.match((await (await request(login)).json()).error,/Muitas tentativas/);
 time+=60001;assert.equal((await (await request(login)).json()).ok,true);
 }finally{await app.close();rmSync(dir,{recursive:true,force:true})}
});
test('Servidor recusa exposição HTTP sem TLS na rede',async()=>{await assert.rejects(startServer({host:'0.0.0.0',port:0}),/certificado confiável/)});
test('HTTPS: certificado verificado, cookie Secure e login funcional',async()=>{
 const {execFileSync}=await import('node:child_process');const {readFileSync}=await import('node:fs');const https=await import('node:https');
 const dir=mkdtempSync(path.join(tmpdir(),'pdv-tls-'));const cert=path.join(dir,'cert.pem'),key=path.join(dir,'key.pem');let app;
 try{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});
 app=await startServer({dataDir:dir,host:'0.0.0.0',port:0,tlsCert:cert,tlsKey:key});
 const request=(action,payload)=>new Promise((resolve,reject)=>{const req=https.request({hostname:'127.0.0.1',port:app.port,path:'/api/action',method:'POST',ca:readFileSync(cert),headers:{'Content-Type':'application/json','X-PDV-Request':'1',Origin:`https://127.0.0.1:${app.port}`}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({headers:res.headers,body:JSON.parse(body)}))});req.on('error',reject);req.end(JSON.stringify({action,payload}))});
 assert.equal((await request('setup',{password:'password-test-123'})).body.ok,true);const result=await request('login',{name:'Marcos',password:'password-test-123'});assert.equal(result.body.ok,true);assert.match(result.headers['set-cookie'][0],/; Secure/);
 }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true})}
});
