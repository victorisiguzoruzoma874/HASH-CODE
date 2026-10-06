const template = document.createElement('template');
template.innerHTML = `
<style>
:host{--accent:#42e5f5;position:fixed;bottom:max(20px,env(safe-area-inset-bottom));right:max(20px,env(safe-area-inset-right));z-index:1000;font:14px/1.5 system-ui,sans-serif;color:#eaf3fb;color-scheme:dark}
:host([placement="left"]){right:auto;left:max(20px,env(safe-area-inset-left))}*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.launcher{display:block;width:var(--size,104px);height:var(--size,104px);border:0;padding:0;background:none;position:relative;perspective:600px;color:inherit}.float,.pose{width:100%;height:100%;position:relative}.float{animation:float 5s ease-in-out infinite;transition:filter .2s}.launcher:hover .float{filter:drop-shadow(0 0 9px var(--accent)) brightness(1.06)}.launcher:hover{translate:0 -3px}.asset{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}.head{position:absolute;inset:0;transform-origin:50% 53%}.eyes{position:absolute;inset:0}.hint{position:absolute;bottom:-12px;left:50%;translate:-50% 0;white-space:nowrap;font-size:10px;letter-spacing:.07em;color:#56717e;background:#f2fbfc;padding:2px 8px;border-radius:20px}
.panel{position:absolute;bottom:calc(var(--size,104px) + 22px);right:0;width:min(380px,calc(100vw - 40px));height:min(530px,calc(100dvh - var(--size,104px) - 72px));min-height:0;background:#0b1928;border:1px solid #254457;border-radius:22px;box-shadow:0 24px 70px #0005;display:flex;flex-direction:column;overflow:hidden;animation:enter .2s ease-out}:host([placement="left"]) .panel{right:auto;left:0}.panel[hidden]{display:none}.header{display:flex;align-items:center;gap:12px;padding:18px;border-bottom:1px solid #243646}.badge{width:38px;height:38px;border-radius:12px;background:#173443;display:grid;place-items:center;color:var(--accent);font-size:21px}.title{font-weight:650}.subtitle{font-size:11px;color:#9bb1c4}.close{margin-left:auto;border:0;background:#1c3041;color:#bed4e4;border-radius:50%;width:30px;height:30px}.history{flex:1;overflow:auto;padding:18px;overscroll-behavior:contain}.message{white-space:pre-wrap;overflow-wrap:anywhere;border-radius:14px;background:#182d3e;padding:12px 14px;margin:0 26px 12px 0}.message.user{background:#224958;margin:0 0 12px 26px}.role{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:5px}.status{padding:0 18px 10px;font-size:12px;color:#aac4d4}.retry{border:1px solid #436476;background:transparent;border-radius:6px;color:var(--accent);margin-left:8px}.composer{display:flex;gap:8px;padding:14px;border-top:1px solid #243646}.input{min-width:0;flex:1;background:#142838;border:1px solid #2e4657;border-radius:12px;color:#eef8ff;padding:12px}.send{background:var(--accent);color:#06202a;border:0;border-radius:12px;padding:10px 14px;font-weight:700}.send:disabled{opacity:.45;cursor:wait}.note{padding:0 18px 12px;color:#879dac;font-size:10px}
@keyframes float{50%{transform:translateY(-5px)}}@keyframes enter{from{opacity:0;transform:translateY(8px)}}@media(max-width:480px){:host{bottom:max(16px,env(safe-area-inset-bottom));right:16px}:host([placement="left"]){left:max(16px,env(safe-area-inset-left))}.panel{width:calc(100vw - 32px);max-height:calc(100dvh - var(--size,104px) - 64px - env(safe-area-inset-bottom));border-radius:18px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.launcher:hover{translate:none}}
</style>
<section class="panel" role="dialog" aria-label="Assistant chat" hidden>
<header class="header"><span class="badge" aria-hidden="true">✦</span><div><div class="title"></div><div class="subtitle"></div></div><button class="close" aria-label="Close chat">×</button></header>
<div class="history" role="log" aria-label="Message history" aria-live="polite" aria-relevant="additions text"></div><div class="status" role="status"></div>
<form class="composer"><input class="input" aria-label="Message the assistant" placeholder="Ask me anything…" maxlength="8000" autocomplete="off"><button class="send" type="submit">Send</button></form><div class="note"></div></section>
<button class="launcher" aria-label="Open assistant chat" aria-expanded="false" aria-haspopup="dialog"><div class="float"><div class="pose"></div></div><span class="hint">ASK AI</span></button>`;

export class RobotChat extends HTMLElement {
  static observedAttributes = ['animated','robot-src','body-src','head-src','eyes-src','size','placement','accent','greeting','assistant-name','endpoint','z-index'];
  constructor() {
    super(); this.attachShadow({mode:'open'}).append(template.content.cloneNode(true));
    this.messages=[]; this.current=[0,0]; this.target=[0,0]; this.open=false; this.busy=false;
    this.$ = s => this.shadowRoot.querySelector(s);
    this.motion=matchMedia('(prefers-reduced-motion: reduce)'); this.mouse=matchMedia('(any-hover: hover) and (any-pointer: fine)');
  }
  connectedCallback() {
    this.listeners=new AbortController(); const signal=this.listeners.signal;
    this.configure();
    this.$('.launcher').addEventListener('click',()=>this.toggle(),{signal});
    this.$('.close').addEventListener('click',()=>this.toggle(false),{signal});
    this.$('form').addEventListener('submit',e=>{e.preventDefault();this.send();},{signal});
    this.shadowRoot.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.open){e.preventDefault();this.toggle(false);}},{signal});
    window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&this.mouse.matches&&!this.motion.matches){this.pointer=[e.clientX,e.clientY];this.aim();}},{signal,passive:true,capture:true});
    document.documentElement.addEventListener('pointerleave',()=>this.neutral(),{signal});
    window.addEventListener('blur',()=>this.neutral(),{signal});
    window.addEventListener('scroll',()=>this.aim(),{signal,passive:true,capture:true});
    window.addEventListener('resize',()=>this.aim(),{signal,passive:true});
    this.motion.addEventListener('change',()=>this.neutral(),{signal});
    this.mouse.addEventListener('change',()=>this.neutral(),{signal});
    this.observer=new ResizeObserver(()=>this.aim());this.observer.observe(this);
    if(!this.messages.length)this.add('assistant',this.getAttribute('greeting')||'Hi! I’m your HashPay assistant. What can I help you with?');
    this.scheduleBlink();
  }
  disconnectedCallback(){this.listeners?.abort();this.request?.abort();this.observer?.disconnect();cancelAnimationFrame(this.frame);clearTimeout(this.blinkTimer);this.blinkAnimation?.cancel();this.frame=0;this.busy=false;}
  attributeChangedCallback(){if(this.isConnected)this.configure();}
  configure(){
    const size=Math.min(200,Math.max(64,Number(this.getAttribute('size'))||104));this.style.setProperty('--size',`${size}px`);
    const accent=this.getAttribute('accent');if(accent&&CSS.supports('color',accent))this.style.setProperty('--accent',accent);
    this.style.zIndex=String(Number(this.getAttribute('z-index'))||1000);
    this.$('.title').textContent=this.getAttribute('assistant-name')||'HashPay Assistant';
    this.$('.subtitle').textContent=this.getAttribute('endpoint')?'AI assistant':'Demo mode · no AI backend connected';
    this.$('.note').textContent=this.getAttribute('endpoint')?'AI responses may be inaccurate. Never share passwords or recovery phrases.':'Local demo responses only. No actions or transactions are performed.';
    this.blinkAnimation?.cancel();
    const pose=this.$('.pose');pose.replaceChildren();pose.style.transform='';
    const assets=['body-src','head-src','eyes-src'];
    const bundled=this.hasAttribute('animated')&&!this.getAttribute('robot-src')&&!assets.some(a=>this.getAttribute(a));
    this.layered=bundled||assets.every(a=>this.getAttribute(a));
    const img=src=>{const el=document.createElement('img');el.className='asset';el.src=src;el.alt='';el.draggable=false;return el;};
    if(this.layered){
      const original=new URL('./robot.png',import.meta.url).href;
      const body=img(bundled?original:this.getAttribute('body-src'));
      body.classList.add('body-asset');
      const head=document.createElement('div');head.className='head';
      const shell=img(bundled?new URL('./robot-face-base.png',import.meta.url).href:this.getAttribute('head-src'));
      const eyes=document.createElement('div');eyes.className='eyes';
      const eye=img(bundled?original:this.getAttribute('eyes-src'));
      eye.style.transformOrigin='50% 32%';
      if(bundled){
        body.style.clipPath='inset(50.5% 0 0 0)';
        shell.style.clipPath='inset(0 0 49% 0)';
        eye.style.maskImage=`url("${new URL('./eyes-mask.svg',import.meta.url).href}")`;
        eye.style.maskSize='100% 100%';eye.style.maskRepeat='no-repeat';
        eye.style.filter='drop-shadow(0 0 1px #42e5f5)';
      }
      eyes.append(eye);head.append(shell,eyes);pose.append(body,head);
    }else{pose.append(img(this.getAttribute('robot-src')||new URL('./robot.png',import.meta.url).href));}
    this.paint();this.aim();
  }
  neutral(){this.pointer=null;this.target=[0,0];if(this.motion.matches){this.blinkAnimation?.cancel();this.current=[0,0];cancelAnimationFrame(this.frame);this.frame=0;this.paint();}else this.animate();}
  layout(){const r=this.$('.launcher').getBoundingClientRect();this.$('.panel').style.maxHeight=`${Math.max(0,r.top-24)}px`;}
  aim(){this.layout();if(!this.pointer||this.motion.matches||!this.mouse.matches)return;const r=this.$('.launcher').getBoundingClientRect();this.target=[Math.tanh((this.pointer[0]-r.left-r.width/2)/Math.max(240,innerWidth*.55)),Math.tanh((this.pointer[1]-r.top-r.height/2)/Math.max(240,innerHeight*.55))];this.animate();}
  animate(){if(this.frame||!this.isConnected)return;let last=performance.now();const tick=now=>{this.frame=0;const f=1-Math.exp(-Math.min(now-last,64)/100);last=now;this.current=this.current.map((v,i)=>v+(this.target[i]-v)*f);this.paint();if(this.current.some((v,i)=>Math.abs(v-this.target[i])>.001))this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
  paint(){const [x,y]=this.current;const el=this.$(this.layered?'.head':'.pose');if(el)el.style.transform=`translate(${this.layered?0:x*4}px,${this.layered?0:y*3}px) rotateX(${-y*8}deg) rotateY(${x*8}deg) rotateZ(${x*(this.layered?5:6)}deg)`;const eyes=this.$('.eyes');if(eyes)eyes.style.transform=`translate(${x*6}px,${y*6}px)`;}
  blink(){const eye=this.$('.eyes .asset');if(!eye||this.motion.matches||!this.isConnected)return;this.blinkAnimation?.cancel();this.blinkAnimation=eye.animate([{transform:'scaleY(1)',offset:0},{transform:'scaleY(.07)',offset:.42},{transform:'scaleY(.07)',offset:.55},{transform:'scaleY(1)',offset:1}],{duration:210,easing:'ease-in-out'});}
  scheduleBlink(){clearTimeout(this.blinkTimer);this.blinkTimer=setTimeout(()=>{this.blink();if(this.isConnected)this.scheduleBlink();},3500+Math.random()*3500);}
  toggle(value=!this.open){this.layout();this.open=value;this.$('.panel').hidden=!value;this.$('.launcher').setAttribute('aria-expanded',String(value));this.$('.launcher').setAttribute('aria-label',value?'Close assistant chat':'Open assistant chat');if(value)this.$('.input').focus();else this.$('.launcher').focus();}
  add(role,content){const message={role,content};this.messages.push(message);const node=document.createElement('div');node.className=`message ${role}`;const label=document.createElement('span');label.className='role';label.textContent=role==='user'?'You':this.getAttribute('assistant-name')||'Assistant';const body=document.createElement('span');body.textContent=content;node.append(label,body);this.$('.history').append(node);this.scroll();return {message,body};}
  scroll(){const log=this.$('.history');log.scrollTop=log.scrollHeight;}
  addAction(answer,action,label){
    const button=document.createElement('button');button.type='button';button.className='retry';button.textContent=label||'Open app task';button.style.cssText='display:block;margin:12px 0 0;padding:9px 12px;text-align:left';
    button.addEventListener('click',async()=>{
      if(!this.performAction){this.$('.status').textContent='This task needs the HashPay app integration.';return;}
      button.disabled=true;
      try{const result=await this.performAction(action);this.$('.status').textContent=result;button.textContent='Opened · review in the app';}
      catch(error){this.$('.status').textContent=error.message;button.disabled=false;}
    });answer.body.parentElement.append(button);this.scroll();
  }
  async send(retry=false){
    if(this.busy)return;const input=this.$('.input');const text=input.value.trim();if(!retry&&!text)return;
    if(!retry){this.add('user',text);input.value='';}this.busy=true;this.$('.send').disabled=true;this.$('.status').textContent='Preparing a response…';this.request=new AbortController();
    let answer;
    try{
      const endpoint=this.getAttribute('endpoint');
      if(!endpoint){answer=this.add('assistant','Demo mode: I can show how this chat works. Connect your own AI backend for real answers. I haven’t accessed your account or performed any actions.');}
      else{
        const history=this.messages.filter(m=>m.content).slice(-24).map(({role,content})=>({role,content}));
        while(history.length>1&&history.reduce((n,m)=>n+m.content.length,0)>32000)history.shift();
        const response=await (this.requestAssistant||fetch)(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'text/event-stream, application/json, text/plain'},body:JSON.stringify({messages:history}),signal:this.request.signal});
        if(!response.ok){let message=`Assistant service returned ${response.status}.`;try{const data=await response.json();if(typeof data.error==='string')message=data.error;}catch{}throw new Error(message);}
        answer=this.add('assistant','');const type=response.headers.get('content-type')||'';
        const append=chunk=>{answer.message.content+=chunk;answer.body.textContent=answer.message.content;this.scroll();};
        if(type.includes('application/json')){const data=await response.json();if(typeof data.content!=='string')throw new Error('Expected a content string from the assistant.');append(data.content);}
        else if(response.body){const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';const event=block=>{const raw=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!raw||raw==='[DONE]')return;const data=JSON.parse(raw);if(typeof data.delta==='string')append(data.delta);if(typeof data.activity==='string')this.$('.status').textContent=data.activity;if(data.action)this.addAction(answer,data.action,data.label);if(data.error)throw new Error(String(data.error));};while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});if(type.includes('text/event-stream')){buffer=buffer.replace(/\r\n/g,'\n');let end;while((end=buffer.indexOf('\n\n'))!==-1){event(buffer.slice(0,end));buffer=buffer.slice(end+2);}if(done&&buffer.trim())event(buffer);}else{append(buffer);buffer='';}if(done)break;}}
        if(!answer.message.content.trim())throw new Error('The assistant returned an empty response.');
      }
      this.$('.status').textContent='';
    }catch(error){if(!this.isConnected)return;if(answer){this.messages.pop();answer.body.parentElement.remove();}this.$('.status').textContent=error.name==='AbortError'?'Response cancelled.':`Couldn’t get a response. ${error.message}`;const button=document.createElement('button');button.className='retry';button.textContent='Retry';button.addEventListener('click',()=>this.send(true),{once:true});this.$('.status').append(button);}
    finally{this.busy=false;this.$('.send').disabled=false;}
  }
}
if(!customElements.get('robot-chat'))customElements.define('robot-chat',RobotChat);
