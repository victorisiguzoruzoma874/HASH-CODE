import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{let file=path.join(root,req.url.split('?')[0]);if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}).listen(4180,'127.0.0.1');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'assistant-app-check-'));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--no-first-run','--disable-gpu','--remote-debugging-port=9342',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
let tabs;for(let i=0;i<50;i++){try{tabs=await(await fetch('http://127.0.0.1:9342/json')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);pending.get(m.id)?.(m);pending.delete(m.id);});const call=(method,params={})=>new Promise(r=>{const n=++id;pending.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.error||r.result.exceptionDetails)throw Error(JSON.stringify(r.error||r.result.exceptionDetails));return r.result.result.value;};
await call('Runtime.enable');ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')console.error('Browser exception:',m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
await call('Page.enable');
await call('Page.addScriptToEvaluateOnNewDocument',{source:`
localStorage.setItem('hp_token','browser-test-session');window.__paymentCalls=0;window.__assistantAuth='';
const original=window.fetch;window.fetch=async(url,init)=>{
 const s=String(url);if(!s.includes('/api/v1/'))return original(url,init);
 let data={data:[],prices:{},orders:[],stats:{}};
 if(s.endsWith('/auth/me'))data={user:{id:'test-user',fullName:'Test User',email:'test@example.test',role:'USER',kycStatus:'NONE',kycLevel:'NONE',linkedWallets:[]}};
 if(s.includes('/wallet/balance'))data={data:{ngnBalance:'5000',hashpayAccountNumber:'1111111111',virtualAccount:null}};
 if(s.includes('/wallet/transactions'))data={data:{transactions:[],total:0}};
 if(s.includes('/wallet/lookup/'))data={data:{fullName:'Test Recipient'}};
 if(s.endsWith('/wallet/send'))window.__paymentCalls++;
 if(s.endsWith('/assistant')){window.__assistantAuth=new Headers(init.headers).get('Authorization');return new Response('data: '+JSON.stringify({action:{kind:'prepare_send',recipientAccountNumber:'1234567890',amount:200},label:'Review transfer'})+'\\n\\ndata: '+JSON.stringify({delta:'The transfer form is ready for your review. No funds moved.'})+'\\n\\ndata: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});}
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
};`});
await call('Page.navigate',{url:'http://127.0.0.1:4180/dashboard'});
for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,200));try{if(await evaluate(`!!document.querySelector('robot-chat')?.performAction`))break;}catch{}}
console.log('page',await evaluate(`({path:location.pathname,text:document.body.innerText.slice(0,80),injection:window.__paymentCalls,robot:!!document.querySelector('robot-chat')})`));
console.log('appIntegration',await evaluate(`(async()=>{const r=document.querySelector('robot-chat');if(!r?.performAction)throw Error('Assistant integration did not mount');r.toggle(true);r.$('.input').value='Prepare a transfer';await r.send();if(window.__assistantAuth!=='Bearer browser-test-session')throw Error('Missing session authorization');if(document.querySelector('#send-account'))throw Error('Form opened without a click');const action=r.shadowRoot.querySelector('.message button');if(!action)throw Error('Missing task button');action.click();await new Promise(t=>setTimeout(t,900));if(document.querySelector('#send-account')?.value!=='1234567890'||document.querySelector('#send-amount')?.value!=='200')throw Error('Draft did not prefill');if(window.__paymentCalls!==0)throw Error('Payment was submitted automatically');await r.performAction({kind:'navigate',target:'portfolio'});await new Promise(t=>setTimeout(t,100));if(location.pathname!=='/dashboard/portfolio')throw Error('Navigation failed');let blocked=false;try{await r.performAction({kind:'navigate',target:'https://evil.example'})}catch{blocked=true}if(!blocked)throw Error('External navigation was allowed');return {authenticated:true,taskButton:true,prefilledDraft:true,noAutomaticPayment:true,navigation:true,invalidActionBlocked:true};})()`));
}catch(e){console.error(e);process.exitCode=1;}finally{ws?.close();chrome.kill();server.close();}
