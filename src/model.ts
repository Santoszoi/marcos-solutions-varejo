export type Product={id:string;name:string;barcode:string|null;cost:number;price:number;stock:number;profile:any};
export type CartRow={id:string;quantity:number;unitPrice:number};
export type Shift={id:string;terminal:number;operator:string;opened:string;closed:string|null;opening:number;counted:number|null;expected:number|null};
export type Sale={id:string;created:string;terminal:number;shift:string;operator:string;total:number;status:string;fiscal_status:string;fiscal_reason:string;items:{id:string;name:string;quantity:number;unitPrice:number;total:number}[];payment:{method:string;amount:number;received:number;change:number}};
export type Snapshot={user:{id:string;name:string;role:string}|null;setup?:boolean;products:Product[];shifts:Shift[];sales:Sale[];cash:{shift:string;amount:number}[];settings:{name:string;uf:string;regime:string;catalog:any;version:number}};
export const money=(c:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
export function cents(value:string):number{const raw=value.trim();if(!/^\d+([,.]\d{1,2})?$/.test(raw))throw Error('Informe um valor, por exemplo 25,90');const [whole,decimal='']=raw.split(/[,.]/);const amount=Number(whole)*100+Number(decimal.padEnd(2,'0'));if(!Number.isSafeInteger(amount)||amount>1e9)throw Error('Valor inválido');return amount}
export function totalCart(rows:CartRow[],_products:Product[]){return rows.reduce((sum,row)=>sum+row.unitPrice*row.quantity,0)}
export const paymentNames:Record<string,string>={cash:'Dinheiro',credit:'Crédito',debit:'Débito',pix:'Pix'};
export const date=(s:string)=>new Date(s).toLocaleString('pt-BR');

// crypto.randomUUID requer contexto seguro; leitores via IP local também precisam de IDs.
export function saleId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
