import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {Store} from './store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function startServer({dataDir=process.env.PDV_DATA_DIR||path.join(root,'dados'),port=Number(process.env.PDV_PORT||4780),host=process.env.PDV_BIND||'127.0.0.1',tlsCert=process.env.PDV_TLS_CERT,tlsKey=process.env.PDV_TLS_KEY,clock=()=>Date.now()}={}) {
 const secure=Boolean(tlsCert&&tlsKey);if(Boolean(tlsCert)!==Boolean(tlsKey))throw Error('Informe certificado e chave TLS');if(!['127.0.0.1','localhost','::1'].includes(host)&&!secure)throw Error('Para usar a rede, configure PDV_TLS_CERT e PDV_TLS_KEY com certificado confiável');const tls=secure?{cert:fs.readFileSync(tlsCert),key:fs.readFileSync(tlsKey),minVersion:'TLSv1.2'}:null;
 fs.mkdirSync(dataDir,{recursive:true});const store=new Store(path.join(dataDir,'pdv.sqlite'));
 const sessions=new Map(),failures=new Map();
 let interfaces=[];try{interfaces=Object.values(os.networkInterfaces()).flat().filter(Boolean).map(x=>x.address)}catch{}
 const allowedHosts=new Set(['localhost','127.0.0.1','[::1]',os.hostname().toLowerCase(),...interfaces]);
 const backup=()=>{const dir=path.join(dataDir,'backups');fs.mkdirSync(dir,{recursive:true});const name=path.join(dir,`pdv-${clock()}-${randomBytes(4).toString('hex')}.sqlite`);store.db.exec("VACUUM INTO '"+name.replaceAll("'","''")+"'");const files=fs.readdirSync(dir).filter(n=>/^pdv-\d+(?:-[a-f0-9]+)?\.sqlite$/.test(n)).sort();for(const n of files.slice(0,-14))fs.unlinkSync(path.join(dir,n));return name};backup();
 const timer=setInterval(()=>{try{backup()}catch(e){console.error('Backup:',e.message)}},3600000);timer.unref();
 const handler=async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))};
  try{
   if(!req.url.startsWith('/')||req.url.startsWith('//'))return send(400,{ok:false,error:'URL inválida'});const origin=`${secure?'https':'http'}://${req.headers.host}`;const address=new URL(req.url,origin);if(!allowedHosts.has(address.hostname.toLowerCase()))return send(403,{ok:false,error:'Host não autorizado'});
   const cookie=String(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('pdv_session='))?.slice(12);
   let auth=sessions.get(cookie);if(auth&&(auth.expires<=clock()||auth.lastSeen+30*60000<=clock())){sessions.delete(cookie);auth=undefined}if(auth)auth.lastSeen=clock();
   if(address.pathname==='/api/snapshot'&&req.method==='GET')return send(200,{ok:true,data:store.snapshot(auth?.user)});
   if(address.pathname==='/api/backup'&&req.method==='POST'){if(req.headers['x-pdv-request']!=='1'||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{ok:false,error:'Origem inválida'});store.admin(auth?.user);const file=backup();res.writeHead(200,{'Content-Type':'application/vnd.sqlite3','Content-Disposition':`attachment; filename="PDV-backup-${clock()}.sqlite"`});fs.createReadStream(file).pipe(res);return}
   if(address.pathname==='/api/action'&&req.method==='POST'){
    if(req.headers['x-pdv-request']!=='1'||!req.headers['content-type']?.startsWith('application/json')||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{ok:false,error:'Origem inválida'});
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1e6)throw Error('Requisição muito grande');chunks.push(chunk)}
    const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.action!=='string'||(input.payload!==undefined&&(!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))))throw Error('Requisição inválida');const {action,payload={}}=input;let data;
    if(action==='setup'){if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw Error('Crie o administrador no computador servidor');data=store.setup(payload)}
    else if(action==='login'){const ip=req.socket.remoteAddress;const rate=failures.get(ip);if(rate&&rate.count>=8&&rate.until>clock())throw Error('Muitas tentativas; aguarde um minuto');try{data=store.login(payload);failures.delete(ip)}catch(e){failures.set(ip,{count:(rate?.until>clock()?rate.count:0)+1,until:clock()+60000});throw e}sessions.delete(cookie);const token=randomBytes(32).toString('hex');sessions.set(token,{user:data,lastSeen:clock(),expires:clock()+8*3600000});res.setHeader('Set-Cookie',`pdv_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`)}
    else if(action==='logout'){sessions.delete(cookie);res.setHeader('Set-Cookie',`pdv_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`);data=true}
    else data=await store.run(auth?.user,action,payload);
    return send(200,{ok:true,data});
   }
   if(address.pathname.startsWith('/api/'))return send(404,{ok:false,error:'Rota não encontrada'});
   if(!['GET','HEAD'].includes(req.method))return send(405,{ok:false,error:'Método inválido'});
   const relative=address.pathname==='/'?'index.html':decodeURIComponent(address.pathname).replace(/^\//,'');const base=path.join(root,'dist');const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return send(404,{ok:false,error:'Arquivo não encontrado'});
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)send(400,{ok:false,error:e.message.includes('UNIQUE constraint')?'Código já cadastrado ou caixa já aberto':e instanceof SyntaxError||e instanceof TypeError||e.code?'Requisição inválida ou falha interna':e.message});else res.end()}
 };
 const server=secure?https.createServer(tls,handler):http.createServer(handler);server.requestTimeout=30000;server.headersTimeout=15000;
 const cleanup=setInterval(()=>{const t=clock();for(const [k,v] of sessions)if(v.expires<=t||v.lastSeen+30*60000<=t)sessions.delete(k);for(const [k,v] of failures)if(v.until<=t)failures.delete(k)},60000);cleanup.unref();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)});
 return {server,store,protocol:secure?'https':'http',port:server.address().port,close:async()=>{clearInterval(timer);clearInterval(cleanup);server.closeIdleConnections();await new Promise(resolve=>server.close(resolve));store.shutdown()}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const instance=await startServer();console.log(`PDV disponível em ${instance.protocol}://localhost:${instance.port}. Mantenha esta janela aberta.`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await instance.close();process.exit(0)})}
