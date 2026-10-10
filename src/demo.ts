// Standalone browser simulation. Never calls the production API.
const KEY = 'ms-varejo-demo-v1';
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
function initial(): any {
 const names = ['Água mineral 500 ml','Refrigerante cola 2 L','Suco de uva 1 L','Água com gás 500 ml','Energético 250 ml','Refrigerante laranja 2 L'];
 return {version:1,user:{id:'visitor',name:'Visitante',role:'admin'},products:names.map((name,i)=>({id:`demo-${i}`,name,barcode:String(1001+i),cost:200+i*100,price:450+i*150,stock:50,profile:null})),shifts:[{id:'demo-shift',terminal:1,operator:'Visitante',opened:now(),closed:null,opening:10000,counted:null,expected:10000}],sales:[],cash:[],settings:{name:'Loja Demonstração',uf:'DF',regime:'',catalog:{},version:1}};
}
function read(): any { const raw=localStorage.getItem(KEY);if(!raw)return initial();const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.sales)||!Array.isArray(data.products))throw Error('Dados da demonstração inválidos. Use Reiniciar demonstração.');return data; }
function integer(n:number,min=0){if(!Number.isSafeInteger(n)||n<min||n>1e9)throw Error('Valor inválido');}
export function resetDemo(){localStorage.removeItem(KEY);localStorage.removeItem('ms-varejo-demo-cart');localStorage.removeItem('ms-varejo-demo-pending');}
export async function demoApi(action:string,p:any={}):Promise<any>{
 try {
 const s=read();let result:any=null;
 const shift=()=>{const x=s.shifts.find((x:any)=>x.terminal===p.terminal&&!x.closed);if(!x)throw Error('Abra este caixa antes de continuar');return x;};
 switch(action){
 case 'snapshot':return s;
 case 'saleStatus':return s.sales.find((x:any)=>x.id===p.id)||null;
 case 'logout':return null;
 case 'sale':{
 const old=s.sales.find((x:any)=>x.id===p.id);if(old){if(old.request!==JSON.stringify(p))throw Error('Identificador já utilizado');return old;}
 const sh=shift();if(!p.items?.length)throw Error('Carrinho vazio');const seen=new Set();
 const items=p.items.map((r:any)=>{if(seen.has(r.id))throw Error('Produto duplicado');seen.add(r.id);integer(r.quantity,1);const product=s.products.find((x:any)=>x.id===r.id);if(!product||r.quantity>product.stock)throw Error('Estoque insuficiente');if(r.unitPrice!==product.price)throw Error('Preço alterado. Atualize o carrinho.');return {...r,name:product.name,total:r.quantity*product.price};});
 const total=items.reduce((n:number,r:any)=>n+r.total,0);integer(total,1);const pay=p.payment;if(!['cash','pix','credit','debit'].includes(pay.method))throw Error('Pagamento inválido');integer(pay.received);if(pay.method==='cash'?pay.received<total:!pay.confirmed)throw Error('Confirme o pagamento simulado');
 result={id:p.id,request:JSON.stringify(p),created:now(),terminal:p.terminal,shift:sh.id,operator:'Visitante',items,total,status:'paid',fiscal_status:'pending',fiscal_reason:'DEMONSTRAÇÃO: sem cobrança e sem emissão fiscal.',payment:{...pay,amount:total,change:pay.method==='cash'?pay.received-total:0}};
 for(const r of items)s.products.find((x:any)=>x.id===r.id).stock-=r.quantity;
 if(pay.method==='cash')sh.expected+=total;s.sales.unshift(result);break;}
 case 'product':{
 if(!String(p.name||'').trim())throw Error('Informe o nome');integer(p.price,1);integer(p.cost);if(p.barcode&&s.products.some((x:any)=>x.barcode===p.barcode&&x.id!==p.id))throw Error('Código já cadastrado');
 const product=s.products.find((x:any)=>x.id===p.id);if(product)Object.assign(product,{name:p.name,barcode:p.barcode,cost:p.cost,price:p.price});else {integer(p.stock);s.products.push({...p,id:id(),profile:null});}break;}
 case 'restock':{integer(p.quantity,1);const product=s.products.find((x:any)=>x.id===p.id);if(!product)throw Error('Produto não encontrado');integer(product.stock+p.quantity);product.stock+=p.quantity;break;}
 case 'open':integer(p.terminal,1);if(p.terminal>6)throw Error('Caixa inválido');integer(p.opening);if(s.shifts.some((x:any)=>x.terminal===p.terminal&&!x.closed))throw Error('Caixa já aberto');s.shifts.unshift({id:id(),terminal:p.terminal,operator:'Visitante',opened:now(),closed:null,opening:p.opening,counted:null,expected:p.opening});break;
 case 'close':{integer(p.counted);const sh=shift();sh.closed=now();sh.counted=p.counted;result={difference:p.counted-sh.expected};break;}
 case 'cashMove':{const sh=shift();integer(Math.abs(p.amount),1);if(sh.expected+p.amount<0)throw Error('Saldo insuficiente');sh.expected+=p.amount;s.cash.push({shift:sh.id,amount:p.amount});break;}
 case 'cancel':{const sale=s.sales.find((x:any)=>x.id===p.id);if(!sale||sale.status!=='paid')throw Error('Venda indisponível');const sh=s.shifts.find((x:any)=>x.id===sale.shift&&!x.closed);if(!sh)throw Error('Caixa já fechado');if(!String(p.reason||'').trim())throw Error('Informe o motivo');sale.status='cancelled';for(const r of sale.items)s.products.find((x:any)=>x.id===r.id).stock+=r.quantity;if(sale.payment.method==='cash')sh.expected-=sale.total;break;}
 default:throw Error('Recurso disponível somente na versão local do PDV.');
 }
 localStorage.setItem(KEY,JSON.stringify(s));return result;
 }catch(error){(error as any).definitive=true;throw error;}
}
