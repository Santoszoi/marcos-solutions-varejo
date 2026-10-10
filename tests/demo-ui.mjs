import {JSDOM} from 'jsdom';
import {readFileSync,readdirSync} from 'node:fs';
import {waitFor,getByRole,getByLabelText,getByText} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';
const dom=new JSDOM('<div id="root"></div>',{url:'https://demo.example',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;globalThis.window=w;globalThis.document=w.document;globalThis.HTMLElement=w.HTMLElement;
w.fetch=()=>{throw Error('Demo must not call API')};w.confirm=()=>true;
w.eval(readFileSync('dist/'+readFileSync('dist/index.html','utf8').match(/src="\/(assets\/[^"]+)"/)[1],'utf8'));
const body=w.document.body;const user=userEvent.setup({document:w.document});
try{await waitFor(()=>getByText(body,'Demonstração interativa'));}catch(e){console.log(body.textContent);process.exit(1)}
await user.click(getByRole(body,'button',{name:/Água mineral 500 ml/}));
await user.keyboard('{F4}');await waitFor(()=>getByRole(body,'dialog'));
await user.click(getByRole(body,'button',{name:'Concluir venda simulada'}));
await waitFor(()=>getByText(body,'DEMONSTRAÇÃO • SEM VALOR COMERCIAL'));
assert.equal(JSON.parse(w.localStorage.getItem('ms-varejo-demo-v1')).sales.length,1);
console.log('Demo UI: venda simulada e comprovante aprovados; zero chamadas à API.');dom.window.close();
