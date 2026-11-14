/* ---------- medewerker-app: persoonlijke links, publiceren en meldingen (alleen op de eigen site, bijv. Netlify) ---------- */
const SERVER=(()=>{try{return typeof window!=='undefined'&&!window.claude&&/^https?:$/.test(location.protocol)}catch(e){return false}})();
function randTok(){const a=new Uint8Array(16);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<16;i++)a[i]=Math.floor(Math.random()*256)}return Array.from(a,b=>b.toString(36).padStart(2,'0')).join('').slice(0,24)}
const STATUS={};
const stMap=date=>(STATUS[date]&&STATUS[date].map)||{};
const hm=t=>{try{return new Date(t).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}catch(e){return''}};
function stChip(id,date){const s=stMap(date)[id];if(!s)return'';
  return s.st==='done'?`<span class="chip ok" title="Gemeld door ${esc(s.name||'')}">${I.check} Gereed ${esc(hm(s.at))}</span>${s.note?`<span class="chip acc" title="Opmerking van ${esc(s.name||'medewerker')}">Opmerking: ${esc(s.note)}</span>`:''}`
    :`<span class="chip bad" title="Gemeld door ${esc(s.name||'')} om ${esc(hm(s.at))}">Probleem: ${esc(s.reason||'')}${s.note?' · '+esc(s.note):''}</span>`}
function stKpi(date,rows,P){if(!SERVER)return'';const ids=rows.flatMap(w=>P.routes[w.id]||[]);if(!ids.length)return'';const m=stMap(date);
  const done=ids.filter(id=>m[id]&&m[id].st==='done').length,iss=ids.filter(id=>m[id]&&m[id].st==='issue').length;
  return`<div class="kpi ${iss?'bad':done===ids.length?'okk':''}"><b>${done} / ${ids.length}</b><span>gereed gemeld${iss?` · ${iss} probleem`:''}</span></div>`}
async function api(path,opts={}){
  const sent=getPw();
  const r=await fetch(path,{cache:'no-store',...opts,headers:{'content-type':'application/json','x-app-password':sent,...(opts.headers||{})}});
  let d={};try{d=await r.json()}catch(e){}
  if(r.status===401)throw{code:'pw',message:d.error,used:sent};if(r.status===404)throw{code:'nofn'};if(!r.ok)throw{code:'srv',status:r.status,message:d.error};return d;
}
const apiErr=e=>e.code==='nofn'?'De serverfunctie is niet gevonden. Deploy de site via GitHub, inclusief netlify/functions en package.json.':e.code==='pw'?'Het wachtwoord klopt niet.':(e.message||'Geen verbinding met de server.');
/* Wachtwoordvenster: één tegelijk, in een eigen laag (een open importvenster blijft staan), en eerst gecontroleerd bij de server */
let PWASK=null;
function askPw(cb){
  if(!PWASK)PWASK=new Promise(res=>pwDialog(res)).finally(()=>{PWASK=null});
  return PWASK.then(ok=>{if(ok&&typeof cb==='function')setTimeout(cb,0);return ok});
}
async function pwCheck(pw){try{const r=await fetch('/api/status?date='+todayIso(),{cache:'no-store',headers:{'x-app-password':pw}});if(r.status===401)return false;return true}catch(e){return null}}
function pwDialog(done){
  let ov=document.getElementById('pwModal');if(!ov){ov=document.createElement('div');ov.id='pwModal';document.body.appendChild(ov)}
  let pref=true;try{pref=localStorage.getItem('wasroute.pwpref')!=='0'}catch(e){}
  ov.innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="pwT" style="width:min(460px,100%)"><form id="pwF" autocomplete="on">
    <h3 id="pwT">App-wachtwoord</h3>
    <p class="note">Vul het wachtwoord in dat in Netlify als APP_PASSWORD is ingesteld. De app controleert het meteen.</p>
    <input type="text" name="username" value="wasroute" autocomplete="username" hidden>
    <label class="fld"><span>Wachtwoord</span><input type="password" id="pwI" name="password" autocomplete="current-password" required></label>
    <label class="chk" style="margin-top:12px"><input type="checkbox" id="pwK"${pref?' checked':''}> <span>Onthoud op deze computer <span class="muted small">(zet uit op een gedeelde computer)</span></span></label>
    <p id="pwE" class="small" role="alert" style="color:var(--bad);min-height:1.3em;margin:8px 0 0"></p>
    <div class="dlg-foot"><span class="sp"></span><button type="button" class="btn" id="pwC">Annuleren</button><button type="submit" class="btn primary" id="pwOk">Doorgaan</button></div>
  </form></div>`;
  ov.hidden=false;setTimeout(()=>{const i=$('#pwI');if(i)i.focus()},20);
  const close=ok=>{ov.hidden=true;ov.innerHTML='';done(ok)};
  $('#pwC').onclick=()=>close(false);
  ov.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close(false)}};
  $('#pwF').onsubmit=async e=>{e.preventDefault();const raw=$('#pwI').value;if(!raw)return;
    const btn=$('#pwOk'),err=$('#pwE');btn.disabled=true;btn.textContent='Controleren\u2026';err.textContent='';
    let pw=raw,ok=await pwCheck(raw);
    if(ok===false&&raw.trim()!==raw&&raw.trim()){const ok2=await pwCheck(raw.trim());if(ok2!==false){pw=raw.trim();ok=ok2}}
    if(ok===false){btn.disabled=false;btn.textContent='Doorgaan';err.textContent='Dit wachtwoord klopt niet. Let op hoofdletters; het moet precies gelijk zijn aan APP_PASSWORD in Netlify.';const i=$('#pwI');i.select();return}
    const keep=$('#pwK').checked;try{localStorage.setItem('wasroute.pwpref',keep?'1':'0')}catch(x){}
    PWMEM=pw;pwStore(pw,keep);try{PWBC&&PWBC.postMessage({pw,force:true})}catch(x){}
    close(true)};
}
async function fetchStatus(date,force){
  if(!SERVER)return;const cur=STATUS[date];if(cur&&(cur.loading||!force))return;
  STATUS[date]={map:(cur&&cur.map)||{},loading:true};
  try{const d=await api('/api/status?date='+date);const before=JSON.stringify((cur&&cur.map)||{});STATUS[date]={map:d.status||{},at:Date.now()};
    if(JSON.stringify(STATUS[date].map)!==before&&S.date===date&&(S.tab==='planning'||S.tab==='opdrachten')&&$('#modal').hidden&&!DRAG)render()}
  catch(e){STATUS[date]={map:(cur&&cur.map)||{},err:e.code||'srv',at:Date.now()}}
}
function routePayload(w,date){
  const P=D.plans[date],ids=((P&&P.routes&&P.routes[w.id])||[]).filter(id=>JOB[id]),why=availWhy(w,date);
  const s=simulate(w,ids,date),sh=shiftOf(w,date);
  return{worker:{id:w.id,name:w.name},date,off:ids.length?'':why,shift:{start:sh.start,end:sh.end,note:sh.o?(sh.o.note||'Afwijkende werktijd'):''},
    depart:ids.length?m2t(s.depart):'',finish:ids.length?m2t(s.finish):'',km:Math.round(s.km),
    pauses:s.seg.filter(g=>g.k==='pause').map(g=>({from:m2t(g.a),to:m2t(g.b)})),
    visits:s.stops.map((p,i)=>{const l=p.loc,cu=CUS[l.customerId]||{};return{nr:i+1,arrive:m2t(p.arrive),start:m2t(p.start),end:m2t(p.end),travel:Math.round(p.travel),
      customer:cu.name||'',contact:cu.contact||'',phone:cu.phone||'',login:cu.login||'',address:l.address||'',postcode:l.postcode||'',city:l.city||'',lat:+l.lat,lng:+l.lng,info:l.info||'',custNote:cu.notes||'',
      jobs:p.jobs.map(id=>{const j=JOB[id],g=s.seg.find(x=>x.k==='job'&&x.id===id);return{id,plate:j.plate,vehicle:j.vehicle||'',type:(TYP[j.type]||{}).name||j.type,duration:jobDur(j),
        window:j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:'',start:g?m2t(g.a):'',end:g?m2t(g.b):'',notes:j.notes||''}})}})};
}
function pubSig(date){const s=JSON.stringify(D.workers.map(w=>routePayload(w,date)));let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h>>>0)}
function pubChip(date){if(!SERVER||!jobsOn(date).length)return'';const P=D.plans[date];
  if(!P||!P.pubSig)return'<span class="chip warn">Niet gepubliceerd</span>';
  return P.pubSig===pubSig(date)?`<span class="chip ok">Gepubliceerd ${esc(hm(P.pubAt))}</span>`:'<span class="chip warn">Gewijzigd na publicatie</span>'}
function openPublish(){
  if(!SERVER){openForm({title:'Medewerker-app',note:'Publiceren naar de medewerker-app werkt in de Netlify-versie van Wasroute. Daar bewaart een serverfunctie de ritten, zodat medewerkers ze op hun telefoon zien. Deze versie in Claude bewaart alles alleen in je eigen browser.',fields:[],values:{},okLabel:'Begrepen',onSave:()=>''});return}
  openForm({title:'Publiceren naar medewerkers',note:'Medewerkers zien hun afspraken in de app zodra je publiceert. Publiceer opnieuw na wijzigingen; meldingen die al binnen zijn blijven bewaard.',
    fields:[{k:'n',label:'Welke dagen',type:'select',wide:1,options:[['1','Alleen '+fdate(S.date,{weekday:'long',day:'numeric',month:'long'})],['7','7 dagen vanaf '+fdate(S.date,{day:'numeric',month:'short'})],['14','14 dagen vanaf '+fdate(S.date,{day:'numeric',month:'short'})]]}],
    values:{n:'7'},okLabel:'Publiceren',onSave:v=>{doPublish(+v.n);return''}});
}
async function doPublish(n){
  const days=[];for(let i=0;i<n;i++){const d=addDays(S.date,i);if(jobsOn(d).length&&!hasPlan(d))autoPlan(d);days.push(d)}
  D.workers.forEach(w=>{if(!w.token)w.token=randTok()});
  const now=new Date().toISOString();
  const body={tokens:D.workers.map(w=>({token:w.token,wid:w.id,name:w.name})),revoke:D.revokeTokens||[],days:days.map(d=>({date:d,routes:D.workers.map(w=>({...routePayload(w,d),publishedAt:now}))}))};
  toast('Publiceren…');
  try{await api('/api/publiceer',{method:'POST',body:JSON.stringify(body)});
    D.revokeTokens=[];days.forEach(d=>{const P=getPlan(d);P.pubSig=pubSig(d);P.pubAt=Date.now()});save();render();
    const nj=days.reduce((s,d)=>s+jobsOn(d).length,0);toast(`Gepubliceerd: ${days.length} dag(en), ${nj} afspraken. Medewerkers zien het direct in hun app.`)}
  catch(e){if(e.code==='pw'){askPw(()=>doPublish(n));return}toast(apiErr(e))}
}
function copyWorkerLink(id){const w=WRK[id];if(!w)return;if(!w.token){w.token=randTok();save()}
  if(!SERVER){toast('De medewerker-app werkt in de Netlify-versie. Kopieer de link daar.');return}
  copyText(`${location.origin}/medewerker.html?t=${w.token}`,`Link voor ${w.name} gekopieerd. Stuur hem naar de medewerker en publiceer de planning.`);
  registerLinks()}
/* Persoonlijke links direct op de server activeren, ook als er nog niets is gepubliceerd */
async function registerLinks(){
  try{await api('/api/publiceer',{method:'POST',body:JSON.stringify({tokens:D.workers.map(w=>({token:w.token,wid:w.id,name:w.name})),revoke:D.revokeTokens||[],days:[]})});D.revokeTokens=[];save()}
  catch(e){if(e.code==='pw'){askPw(registerLinks);return}toast('Link gekopieerd, maar nog niet geactiveerd: '+apiErr(e))}
}


/* ---------- berichten: planner <-> medewerker-app ---------- */
const MSG={list:[],at:0,err:'',loading:false};
const MSGT=['Je planning is gewijzigd, kijk even in de app.','Bel even met kantoor als je kunt.','De volgende klant heeft afgezegd, ga door naar de klant daarna.','De klant is later aanwezig; je kunt pas na {tijd} terecht.','Neem extra tijd voor deze auto, de klant heeft extra wensen.'];
let MV=null; // geopende berichtenweergave {wid|'all', draft, urgent, sel:Set, ref, date}
function msgList(){return SERVER?MSG.list:(D.msgs||[])}
const msgUnread=wid=>msgList().filter(m=>m.from==='worker'&&!m.readAt&&(!wid||m.wid===wid)).length;
async function fetchMsgs(force){
  if(!SERVER||MSG.loading)return;if(!force&&MSG.at&&Date.now()-MSG.at<20000)return;
  MSG.loading=true;
  try{const d=await api('/api/berichten');const before=JSON.stringify(MSG.list);MSG.list=d.messages||[];MSG.err='';MSG.at=Date.now();
    if(JSON.stringify(MSG.list)!==before){if(MV)renderMsgs();else if(S.tab==='planning'&&$('#modal').hidden&&!DRAG)render()}}
  catch(e){MSG.err=e.code||'srv';MSG.at=Date.now()}
  MSG.loading=false;
}
function demoMsgs(){
  if(D.msgs)return;const t=Date.now(),iso=x=>new Date(t-x*60000).toISOString();
  D.msgs=[{id:'dm1',wid:'w2',from:'planner',text:'Goedemorgen Sanne, bij Autohuis Lage Weide staan vandaag 5 auto’s klaar in plaats van 3.',urgent:false,date:S.date,at:iso(140),readAt:iso(131)},
    {id:'dm2',wid:'w2',from:'worker',name:'Sanne Jansen',text:'Top, ik neem extra doeken mee. Lukt het om Studio Glans iets later te doen?',at:iso(126),readAt:null},
    {id:'dm3',wid:'w1',from:'planner',text:'Mark, de bus van Bouwbedrijf Merwede staat vandaag aan de achterkant van het terrein.',urgent:true,date:S.date,at:iso(65),readAt:null}];
}
function openMsgs(o={}){
  if(!SERVER)demoMsgs();
  const wid=o.wid||(MV&&MV.wid)||((D.workers.find(w=>msgUnread(w.id))||{}).id)||'all';
  const planned=D.workers.filter(w=>((getPlan(S.date).routes||{})[w.id]||[]).length).map(w=>w.id);
  MV={wid,draft:o.text||'',urgent:!!o.urgent,ref:o.ref||'',sel:new Set(planned.length?planned:D.workers.map(w=>w.id))};
  FORM=null;renderMsgs(true);markSeen(wid);if(SERVER)fetchMsgs(true);
}
function markSeen(wid){
  const items=msgList().filter(m=>m.from==='worker'&&!m.readAt&&(wid==='all'||m.wid===wid));if(!items.length)return;
  const now=new Date().toISOString();items.forEach(m=>m.readAt=now);
  if(SERVER)withPw(()=>api('/api/berichten',{method:'POST',body:JSON.stringify({action:'seen',items:items.map(m=>({wid:m.wid,id:m.id}))})})).catch(()=>{});else save();
}
function msgStatus(m){
  if(m.from==='worker')return`${esc(hm(m.at))}`;
  return m.readAt?`${esc(hm(m.at))} · <span style="color:var(--ok)">${I.check} gelezen ${esc(hm(m.readAt))}</span>`:`${esc(hm(m.at))} · ${SERVER?'nog niet gelezen':'voorbeeld, niet verstuurd'}`;
}
function msgDay(m){const d=String(m.at).slice(0,10);return d===todayIso()?'Vandaag':d===addDays(todayIso(),-1)?'Gisteren':fdate(d,{weekday:'short',day:'numeric',month:'short'})}
function renderMsgs(first){
  if(!MV)return;const m=$('#modal');const ta=$('#msgTxt');if(ta&&!first)MV.draft=ta.value;
  const scrollEnd=first||(()=>{const c=$('#msgThread');return!c||c.scrollTop+c.clientHeight>=c.scrollHeight-30})();
  const all=msgList(),wid=MV.wid;
  const lastOf=w=>all.filter(x=>x.wid===w.id).slice(-1)[0];
  const side=`<button class="mth${wid==='all'?' sel':''}" data-act="msgw" data-wid="all"><b>${I.send} Bericht aan meerdere</b><small>Iedereen of een selectie</small></button>`+
    D.workers.map(w=>{const l=lastOf(w),n=msgUnread(w.id);return`<button class="mth${wid===w.id?' sel':''}" data-act="msgw" data-wid="${w.id}"><b><i class="dot" style="background:${wc(w)}"></i>${esc(w.name)}${n?`<span class="tabbadge">${n}</span>`:''}</b><small>${l?(l.from==='worker'?'':'Jij: ')+esc(l.text.slice(0,48)):'Nog geen berichten'}</small></button>`}).join('');
  let thread='',head='',to='';
  if(wid==='all'){
    const recent=all.filter(x=>x.from==='planner').slice(-40);
    const groups=[];for(const x of recent){const g=groups.find(g=>g.text===x.text&&Math.abs(new Date(g.at)-new Date(x.at))<5000);if(g)g.items.push(x);else groups.push({text:x.text,at:x.at,urgent:x.urgent,items:[x]})}
    thread=groups.length?groups.map(g=>`<div class="bub me${g.urgent?' urg':''}"><div>${esc(g.text)}</div><small>${esc(msgDay(g))} ${esc(hm(g.at))} · ${g.items.map(x=>{const w=WRK[x.wid];return`<span title="${x.readAt?'Gelezen '+hm(x.readAt):'Nog niet gelezen'}">${esc(w?w.name.split(' ')[0]:'?')} ${x.readAt?'✓':'•'}</span>`}).join(', ')}</small></div>`).join(''):'<p class="muted small" style="margin:auto;text-align:center">Nog geen berichten verstuurd.</p>';
    head='<h3 id="msT" style="margin:0">Bericht aan meerdere medewerkers</h3>';
    to=`<div class="row msg-to"><span class="small muted">Aan:</span>${D.workers.map(w=>`<label class="fchip"><input type="checkbox" data-msgsel="${w.id}"${MV.sel.has(w.id)?' checked':''}> ${esc(w.name)}</label>`).join('')}</div>`;
  }else{
    const w=WRK[wid];const th=all.filter(x=>x.wid===wid);let lastDay='';
    thread=th.length?th.map(x=>{const d=msgDay(x),sep=d!==lastDay?`<div class="mday">${esc(d)}</div>`:'';lastDay=d;
      return sep+`<div class="bub ${x.from==='planner'?'me':'them'}${x.urgent?' urg':''}">${x.urgent?'<b class="small">Urgent</b>':''}${x.ref?`<span class="small muted">Over ${esc(x.ref)}</span>`:''}<div>${esc(x.text)}</div><small>${msgStatus(x)}</small></div>`}).join(''):`<p class="muted small" style="margin:auto;text-align:center">Nog geen berichten met ${esc(w?w.name:'deze medewerker')}.</p>`;
    head=`<h3 id="msT" style="margin:0;display:flex;gap:8px;align-items:center"><i class="dot" style="background:${wc(w)}"></i>${esc(w?w.name:'')}</h3>${w&&w.phone?`<a class="small" href="tel:${esc(String(w.phone).replace(/[^\d+]/g,''))}">${esc(w.phone)}</a>`:''}`;
  }
  const tpl=MSGT.map((t,i)=>`<button class="fchip" data-act="msgtpl" data-i="${i}">${esc(t.length>34?t.slice(0,32)+'…':t)}</button>`).join('');
  m.innerHTML=`<div class="dlg msgdlg" role="dialog" aria-modal="true" aria-labelledby="msT">
    <div class="msgside">${side}</div>
    <div class="msgmain"><div class="row">${head}<span class="sp"></span>${SERVER?`<button class="btn sm" data-act="msgref">Ververs</button>`:''}<button class="iconbtn" data-act="msgclose" aria-label="Sluiten"><svg class="ic" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
      ${!SERVER?'<p class="small" style="margin:0;color:var(--warn)">Voorbeeld: berichten worden pas echt verstuurd in de Netlify-versie.</p>':MSG.err==='pw'?'<p class="small" style="margin:0;color:var(--bad)">Wachtwoord nodig om berichten op te halen. Klik op Ververs.</p>':''}
      <div class="chat" id="msgThread">${thread}</div>
      ${to}
      <div class="row msg-tpl">${tpl}</div>
      ${MV.ref?`<div class="small muted">Over: <b>${esc(MV.ref)}</b> <button class="linkbtn" data-act="msgnoref">weghalen</button></div>`:''}
      <textarea id="msgTxt" rows="3" placeholder="Typ een bericht voor de app van de medewerker…" maxlength="1000">${esc(MV.draft)}</textarea>
      <div class="row"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="msgUrg"${MV.urgent?' checked':''}> Urgent (valt extra op in de app)</label><span class="sp"></span><button class="btn primary" data-act="msgsend">${I.send} Versturen</button></div>
    </div></div>`;
  m.hidden=false;
  const c=$('#msgThread');if(c&&scrollEnd)c.scrollTop=c.scrollHeight;
  if(first){const t=$('#msgTxt');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}}
}
async function sendMsg(){
  const text=($('#msgTxt').value||'').trim();MV.draft=text;MV.urgent=$('#msgUrg').checked;
  if(!text){toast('Schrijf eerst een bericht.');return}
  const wids=MV.wid==='all'?[...MV.sel]:[MV.wid];if(!wids.length){toast('Kies minimaal één medewerker.');return}
  const body={action:'send',wids,text,urgent:MV.urgent,date:S.date,ref:MV.ref};
  if(!SERVER){const now=new Date().toISOString();D.msgs=(D.msgs||[]).concat(wids.map(w=>({id:uid('m'),wid:w,from:'planner',text,urgent:MV.urgent,date:S.date,ref:MV.ref,at:now,readAt:null})));save();MV.draft='';MV.ref='';$('#msgTxt').value='';renderMsgs();toast('Voorbeeld: in de Netlify-versie gaat dit naar de app.');return}
  const btn=document.querySelector('[data-act="msgsend"]');if(btn)btn.disabled=true;
  try{const d=await withPw(()=>api('/api/berichten',{method:'POST',body:JSON.stringify(body)}));MSG.list=MSG.list.concat(d.messages||[]);MV.draft='';{const t=$('#msgTxt');if(t)t.value=''}MV.ref='';MV.urgent=false;renderMsgs();
    toast(wids.length>1?`Bericht verstuurd naar ${wids.length} medewerkers.`:`Bericht verstuurd naar ${WRK[wids[0]].name}.`)}
  catch(e){toast(apiErr(e));if(btn)btn.disabled=false}
}
function msgBtn(){const n=msgUnread();return`<button class="btn" data-act="msgs" title="Berichten naar de app van medewerkers">${I.chat} Berichten${n?` <span class="tabbadge" title="${n} ongelezen antwoord(en)">${n}</span>`:''}</button>`}

/* ---------- meldingen van medewerkers in één overzicht ---------- */
const repKind=s=>s.st==='issue'?'probleem':s.note?'opmerking':'gereed';
const isHandled=id=>!!(D.handled&&D.handled[id]);
function openIssues(date){const m=stMap(date);return Object.keys(m).filter(id=>JOB[id]&&!isHandled(id)&&(m[id].st==='issue'||m[id].note)).length}
function reportsPanel(st){
  if(!SERVER)return'';
  const m=stMap(st.date),items=[];
  for(const w of st.rows)for(const id of (st.P.routes[w.id]||[])){const s=m[id],j=JOB[id];if(s&&j)items.push({id,w,j,l:LOC[j.locationId]||{},s,k:repKind(s),h:isHandled(id)})}
  const refresh=`<button class="btn sm" data-act="refreshst">Ververs</button>`;
  const last=STATUS[st.date]&&STATUS[st.date].at?`<span class="small muted">bijgewerkt ${esc(hm(STATUS[st.date].at))}</span>`:'';
  if(!items.length)return`<section class="panel reports"><div class="row"><h2>Meldingen van medewerkers</h2><span class="small muted">Nog geen meldingen voor deze dag.</span><span class="sp"></span>${last}${refresh}</div></section>`;
  const cnt={aandacht:items.filter(i=>!i.h&&i.k!=='gereed').length,probleem:items.filter(i=>i.k==='probleem').length,opmerking:items.filter(i=>i.k==='opmerking').length,gereed:items.filter(i=>i.k==='gereed').length,alle:items.length};
  const f=S.repF||'aandacht';
  const shown=items.filter(i=>f==='alle'||(f==='aandacht'?!i.h&&i.k!=='gereed':i.k===f)).sort((a,b)=>String(b.s.at).localeCompare(String(a.s.at)));
  const lab={aandacht:'Aandacht nodig',probleem:'Problemen',opmerking:'Opmerkingen',gereed:'Alleen gereed',alle:'Alles'};
  const chips=Object.keys(lab).map(k=>`<button class="fchip" data-act="repf" data-k="${k}" aria-pressed="${f===k}">${lab[k]} <span>${cnt[k]}</span></button>`).join('');
  const rows=shown.map(i=>{const cu=CUS[i.l.customerId]||{};
    const txt=i.k==='probleem'?`<b style="color:var(--bad)">${esc(i.s.reason||'Probleem')}</b>${i.s.note?' · '+esc(i.s.note):''}`:i.k==='opmerking'?`<b style="color:var(--ok)">Gereed</b> · ${esc(i.s.note)}`:'<span style="color:var(--ok)">Gereed</span>';
    return`<li class="rep rep-${i.k}${i.h?' handled':''}"><time>${esc(hm(i.s.at))}</time>
      <div class="rep-main"><div class="row"><i class="dot" style="background:${wc(i.w)}"></i><b>${esc(i.w.name)}</b>${plateBtn(i.j)}<span class="muted">${esc(cu.name||'')}, ${esc(i.l.city||'')}</span></div><div>${txt}</div></div>
      <div class="rep-act"><button class="btn sm" data-act="visit" data-wid="${i.w.id}" data-loc="${i.l.id}">Bekijk</button>${i.k==='probleem'?(()=>{const d=bcDecide(i.j,i.s);return`<button class="btn sm${d.send?' on':''}" data-act="bctoggle" data-id="${i.id}" aria-pressed="${d.send}" title="${esc(d.why)}">${d.send?'Naar BC: ja':'Naar BC: nee'}</button>`})():''}${i.k!=='gereed'?`<button class="btn sm${i.h?' on':''}" data-act="handled" data-id="${i.id}" title="${i.h?'Weer als open markeren':'Markeren als afgehandeld'}">${I.check} ${i.h?'Afgehandeld':'Afhandelen'}</button>`:''}</div></li>`}).join('');
  return`<section class="panel reports"><div class="row"><h2>Meldingen van medewerkers</h2>${cnt.aandacht?`<span class="chip bad">${cnt.aandacht} open</span>`:''}<span class="sp"></span>${last}${refresh}</div>
    <div class="row" style="margin:10px 0">${chips}</div>
    ${rows?`<ul class="reps">${rows}</ul>`:`<p class="small muted" style="margin:0">${f==='aandacht'?'Alles is afgehandeld.':'Geen meldingen in deze selectie.'}</p>`}</section>`;
}
/* ---------- slim voorstel: doorrekenen van alternatieven ---------- */
let PROP=null,SAMPLE=null,AICTL=null;
function proposeFor(ids,date){
  const js=ids.map(id=>JOB[id]).filter(Boolean);if(!js.length)return[];
  const today=new Date().toISOString().slice(0,10),kw=D.settings.kmWeight||0;
  const routesFor=d=>{if(d!==date&&jobsOn(d).length&&!hasPlan(d))autoPlan(d);const P=D.plans[d],R={};D.workers.filter(w=>avail(w,d)).forEach(w=>R[w.id]=((P&&P.routes&&P.routes[w.id])||[]).filter(id=>!ids.includes(id)));return R};
  const span=s=>{const g=s.seg.filter(x=>x.k==='job'&&ids.includes(x.id));const m={};g.forEach(x=>m[x.id]=[x.a,x.b]);return{st:Math.min(...g.map(x=>x.a)),en:Math.max(...g.map(x=>x.b)),m}};
  const froms=js.map(j=>t2m(j.from)).filter(x=>x!=null),tos=js.map(j=>t2m(j.to)).filter(x=>x!=null);
  const f0=froms.length?Math.min(...froms):null,t0=tos.length?Math.max(...tos):null;
  const shift=[],day=[];
  {const R=routesFor(date),saved=js.map(j=>[j.from,j.to]);
    /* Schuif het hele tijdvak in stappen van 5 minuten, zo dicht mogelijk bij het gevraagde tijdstip (max. 2 uur) */
    const offs=[0];if(f0!=null||t0!=null)for(let m=5;m<=120;m+=5)offs.push(m,-m);
    try{for(const wid in R){const w=WRK[wid];if(js.some(j=>!skillOk(w,j)))continue;const base=simulate(w,R[wid]);let best=null;
        for(const k of offs){if(best&&Math.abs(k)>best.dev+.5)break;
          if(js.some((j,i)=>{const a=t2m(saved[i][0]),b=t2m(saved[i][1]);return(a!=null&&a+k<0)||(b!=null&&b+k>1439)}))continue;
          js.forEach((j,i)=>{const a=t2m(saved[i][0]),b=t2m(saved[i][1]);j.from=a!=null?m2t(a+k):'';j.to=b!=null?m2t(b+k):''});
          for(let p=0;p<=R[wid].length;p++){const arr=R[wid].slice(0,p).concat(ids,R[wid].slice(p));const s=simulate(w,arr);if(!feas(s))continue;
            const{st,en,m}=span(s);const dev=Math.abs(k),dtrav=s.trav-base.trav,dkm=s.km-base.km,score=dev*2+dtrav+kw*dkm;
            if(!best||score<best.score)best={kind:'shift',date,wid,arr,start:st,end:en,segs:m,dev,early:k<0,dtrav,dkm,score}}}
        if(best)shift.push(best)}
    }finally{js.forEach((j,i)=>{j.from=saved[i][0];j.to=saved[i][1]})}
  }
  for(let k=-7;k<=14;k++){if(!k)continue;const d=addDays(date,k);if(d<today)continue;const R=routesFor(d);let best=null;const sd=js.map(j=>j.date);js.forEach(j=>j.date=d);
    try{for(const wid in R){const w=WRK[wid];if(js.some(j=>!skillOk(w,j)))continue;const base=simulate(w,R[wid]);const b=bestPos(w,R[wid],ids,true);if(!b)continue;
      const{st,en,m}=span(b.s);const dtrav=b.s.trav-base.trav,dkm=b.s.km-base.km,score=Math.abs(k)*25+dtrav+kw*dkm;
      if(!best||score<best.score)best={kind:'day',date:d,wid,arr:b.arr,start:st,end:en,segs:m,dev:0,dtrav,dkm,score,days:k}}
    }finally{js.forEach((j,i)=>j.date=sd[i])}
    if(best)day.push(best)}
  shift.sort((a,b)=>a.score-b.score);day.sort((a,b)=>a.score-b.score);
  return shift.slice(0,4).concat(day.slice(0,3));
}
/* Waarom kan een medewerker deze klus niet op het gevraagde tijdstip doen? */
function verdict(w,ids,date,route){
  const why=availWhy(w,date),js=ids.map(id=>JOB[id]);
  const sk=js.map(jobSkill).find(s=>s&&!(w.skills||[]).includes(s));if(sk)return{ok:false,txt:why||`Mist vaardigheid "${sk}"`};
  if((w.absent||[]).includes(date))return{ok:false,txt:why};
  const sh=shiftOf(w,date);let res=null;
  if(why)res={ok:false,txt:why};
  else{const s=simulate(w,ids),p=s.stops[0],last=s.stops[s.stops.length-1];
    if(s.late>.5&&p)return{ok:false,txt:`Kan pas om ${m2t(p.arrive)} aankomen (begintijd ${sh.start}, ${fdur(p.travel)} rijden)`};
    if(s.over>.5&&last){const we=t2m(sh.end);res={ok:false,txt:last.end>we?`Werktijd eindigt om ${sh.end}, de klus loopt tot ${m2t(last.end)}`:`Terug op standplaats om ${m2t(s.finish)}, na einde werktijd ${sh.end}`}}
    else{const b=bestPos(w,route||[],ids,true);
      if(b){const g=b.s.seg.find(x=>x.k==='job'&&x.id===ids[0]);return{ok:true,txt:`Kan op het gevraagde tijdstip${g?' ('+m2t(g.a)+')':''}`}}
      res={ok:false,txt:'Past niet tussen de bestaande afspraken van die dag'}}}
  /* Zou het passen als deze medewerker die dag incidenteel langer (of extra) werkt? */
  w.overrides=w.overrides||{};const prev=w.overrides[date];
  try{w.overrides[date]={start:sh.start,end:'23:59'};
    const b=bestPos(w,route||[],ids,true);
    if(b){const lastEnd=b.s.stops.length?b.s.stops[b.s.stops.length-1].end:b.s.finish;const need=D.settings.endAtLast===true?lastEnd:b.s.finish;
      const endM=Math.max(t2m(sh.end),Math.ceil(need/15)*15);
      if(endM<=t2m(sh.end)+240)res.extend={start:sh.start,end:m2t(endM),extra:endM-t2m(sh.end),extraDay:!!why}}
  }finally{if(prev)w.overrides[date]=prev;else delete w.overrides[date]}
  return res;
}
function openPropose(ids){
  const j0=JOB[ids[0]];if(!j0)return;const date=j0.date,l=LOC[j0.locationId]||{},cu=CUS[l.customerId]||{};
  const P=D.plans[date],planned=P&&Object.values(P.routes||{}).some(r=>r.includes(ids[0]));
  const reason=planned?'Ingepland, maar buiten het tijdvak van de klant':whyUnplanned(j0,date);
  const Pd=D.plans[date]||{routes:{}};
  const verd=D.workers.map(w=>({w,...verdict(w,ids,date,((Pd.routes||{})[w.id]||[]).filter(id=>!ids.includes(id)))}));
  const cands=proposeFor(ids,date);let rec=-1,bs=Infinity;cands.forEach((c,i)=>{if(c.score<bs){bs=c.score;rec=i}});
  PROP={ids,date,cands,rec,reason};FORM=null;const mode=aiMode();
  const win=ids.map(id=>JOB[id]).map(j=>j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:'hele dag').filter((x,i,a)=>a.indexOf(x)===i).join(', ');
  const row=(c,i)=>{const w=WRK[c.wid];let tag;
    if(c.kind==='shift')tag=c.dev<.5?'<span class="chip ok">Binnen tijdvak</span>':`<span class="chip warn">${fdur(c.dev)} ${c.early?'eerder':'later'} dan tijdvak</span>`;
    else tag=`<span class="chip acc">${c.days>0?c.days+' dag'+(c.days>1?'en':'')+' later':(-c.days)+' dag'+(c.days<-1?'en':'')+' eerder'}</span>`;
    return`<div class="prop${i===rec?' rec':''}"><div class="prop-main"><div class="row"><span class="chip">Optie ${i+1}</span><b><i class="dot" style="background:${wc(w)}"></i> ${esc(w.name)}</b><span class="chip acc ai-tag" hidden>AI-advies</span>${i===rec?'<span class="chip ok">Aanbevolen</span>':''}</div>
      <div class="prop-t">${esc(fdate(c.date,{weekday:'short',day:'numeric',month:'short'}))} · ${m2t(c.start)}–${m2t(c.end)}</div>
      <div class="row small muted">${tag}<span>+${fdur(Math.max(0,c.dtrav))} rijden · +${fkm(Math.max(0,c.dkm))}</span></div></div>
      <button class="btn ${i===rec?'primary':''} sm" data-act="papply" data-i="${i}">Toepassen</button></div>`};
  const sh=cands.map((c,i)=>c.kind==='shift'?row(c,i):'').join(''),dy=cands.map((c,i)=>c.kind==='day'?row(c,i):'').join('');
  $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="pT" style="width:min(720px,100%)"><h3 id="pT">Slim voorstel</h3>
    <div class="row" style="margin-bottom:6px">${ids.map(id=>plateHtml(JOB[id].plate)).join(' ')}<b>${esc(cu.name)}</b><span class="muted">${esc(l.address)}, ${esc(l.postcode)} ${esc(l.city)}</span></div>
    <p class="note" style="margin:0 0 4px">${esc(fdate(date))} · tijdvak ${esc(win)} · ${ids.reduce((s,id)=>s+jobDur(JOB[id]),0)} min reinigen</p>
    <p class="small" style="color:var(--warn);margin:0 0 14px">${esc(reason)}</p>
    <h4 class="ph">Per medewerker op het gevraagde tijdstip</h4><ul class="verd">${verd.map(v=>`<li><i class="dot" style="background:${wc(v.w)}"></i><b>${esc(v.w.name)}</b><span style="color:var(--${v.ok?'ok':'warn'})">${esc(v.txt)}</span>${v.extend?`<button class="btn sm" data-act="extend" data-wid="${v.w.id}" data-start="${v.extend.start}" data-end="${v.extend.end}">${v.extend.extraDay?`Extra laten werken ${v.extend.start}–${v.extend.end}`:`Incidenteel tot ${v.extend.end} (+${fdur(v.extend.extra)})`}</button>`:''}</li>`).join('')}</ul>
    <h4 class="ph">Zelfde dag, ander tijdstip</h4>${sh||'<p class="small muted">Ook met een ander tijdstip past dit bij niemand binnen de werktijden.</p>'}
    <h4 class="ph">Andere dag, zelfde tijdvak</h4>${dy||'<p class="small muted">Geen dag in de komende twee weken waarop het tijdvak past.</p>'}
    <h4 class="ph">AI-advies</h4>
    <div id="aiBox"><p class="small muted" id="aiNote">${mode==='claude'?'Claude beoordeelt de opties hierboven en schrijft een conceptbericht aan de klant. Dit gebruikt je eigen Claude-tegoed.':mode==='server'?'Claude beoordeelt de opties hierboven en schrijft een conceptbericht aan de klant, via de API-sleutel van deze site.':'AI-advies is hier niet beschikbaar. De doorgerekende opties hierboven werken wel.'}</p>
    ${mode&&cands.length?`<div class="row"><input type="password" id="aiPw" class="mini" placeholder="App-wachtwoord" aria-label="App-wachtwoord" autocomplete="current-password" style="padding:6px 8px" hidden><button class="btn" id="aiBtn" data-act="askai">${I.auto} Vraag Claude om advies</button><button class="btn ghost" id="aiStop" data-act="aistop" hidden>Stoppen</button></div>`:''}<div id="aiOut" class="ai-out" hidden></div></div>
    <p class="hint">Toepassen past het tijdvak of de datum van de opdracht aan, plant hem bij deze medewerker en zet hem vast. Stem de wijziging af met de klant.</p>
    <div class="dlg-foot"><span class="sp"></span><button type="button" class="btn" data-act="dlgx">Sluiten</button></div></div>`;
  $('#modal').hidden=false;
}
/* Een gekozen alternatief toepassen: tijdvak of datum aanpassen, of een collega incidenteel langer laten werken, en inplannen + vastzetten */
function applyCand(ids,old,c){
  ids.forEach(id=>{const j=JOB[id],sg=c.segs&&c.segs[id];
    if(c.kind==='shift'&&sg){const was=j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:'hele dag';j.from=m2t(sg[0]);j.to=m2t(sg[1]);j.notes=((j.notes?j.notes+' · ':'')+`Tijdvak aangepast (was ${was})`)}
    else if(c.kind==='day'){j.date=c.date;j.notes=((j.notes?j.notes+' · ':'')+`Verplaatst van ${fdate(old,{day:'numeric',month:'short'})}`)}});
  if(c.kind==='extend'){const w=WRK[c.wid];w.overrides=w.overrides||{};w.overrides[c.date]={start:c.xstart,end:c.xend,note:c.extraDay?'Extra werkdag':'Incidenteel langer'}}
  const Pold=getPlan(old);for(const k of Object.keys(Pold.routes))Pold.routes[k]=Pold.routes[k].filter(id=>!ids.includes(id));ids.forEach(id=>delete Pold.pinned[id]);
  const P=getPlan(c.date);for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>!ids.includes(id));
  const w=WRK[c.wid],r=P.routes[c.wid]||[],b=bestPos(w,r,ids,true)||bestPos(w,r,ids,false);
  P.routes[c.wid]=b.arr;ids.forEach(id=>P.pinned[id]=c.wid);P.edited=Date.now();if(!P.auto)P.auto=Date.now();
  const g=b.s.seg.find(x=>x.k==='job'&&x.id===ids[0]);return g?g.a:null;
}
function applyProp(i){
  const c=PROP&&PROP.cands[i];if(!c)return;const fs=PROP.fromSick;const t=applyCand(PROP.ids,PROP.date,c);
  if(AICTL)AICTL.abort();closeForm();PROP=null;save();render();
  toast(`Ingepland bij ${WRK[c.wid].name} op ${fdate(c.date,{weekday:'short',day:'numeric',month:'short'})} om ${m2t(t!=null?t:c.start)} en vastgezet.`);
  if(fs&&SICK)setTimeout(openSickResult,0);
}

/* ---------- ziekmelding: afspraken herverdelen en de rest met AI oplossen ---------- */
let SICK=null;
function openSick(wid){
  const w=WRK[wid];if(!w)return;
  openForm({title:`${w.name} ziek melden`,note:'De afspraken van deze medewerker op deze dag(en) worden automatisch herverdeeld over collega’s, zonder hun bestaande planning om te gooien. Wat niet past los je daarna op met AI-advies of het Slim voorstel. Je kunt alles ongedaan maken.',
    fields:[{k:'from',label:'Vanaf',type:'date',req:1},{k:'to',label:'Tot en met',type:'date',req:1}],values:{from:S.date,to:S.date},okLabel:'Ziek melden en herplannen',
    onSave:v=>{if(v.to<v.from)return'"Tot en met" moet op of na "Vanaf" liggen.';if((new Date(v.to)-new Date(v.from))/864e5>30)return'Kies maximaal 31 dagen.';setTimeout(()=>runSick(wid,v.from,v.to,'Ziek'),0);return''}});
}
function runSick(wid,from,to,note,opts={}){
  const w=WRK[wid],dates=[];for(let d=from;d<=to;d=addDays(d,1))dates.push(d);
  for(const d of dates)if(jobsOn(d).length&&!hasPlan(d))autoPlan(d);
  const snap=JSON.stringify({jobs:D.jobs,plans:D.plans,workers:D.workers,absences:D.absences||[]});
  const days=dates.map(d=>{const P=getPlan(d),before={};D.workers.forEach(x=>{if(x.id!==wid&&P.routes[x.id])before[x.id]=(t=>t.serv+t.trav)(simulate(x,P.routes[x.id],d))});return{date:d,aff:(P.routes[wid]||[]).filter(id=>JOB[id]),before}});
  if(opts.rec)D.absences=(D.absences||[]).filter(x=>x.id!==opts.rec.id).concat(opts.rec);
  else if(!opts.existing){removeAbsenceDates(wid,from,to);D.absences=(D.absences||[]).concat({id:uid('a'),wid,type:opts.type||'ziek',from,to,part:'',time:'',note:note&&note!=='Ziek'?note:'',at:Date.now()})}
  syncAbsences();
  for(const day of days){
    const d=day.date,P=getPlan(d);delete P.routes[wid];day.aff.forEach(id=>{if(P.pinned[id]===wid)delete P.pinned[id]});
    if(!day.aff.length)continue;
    /* Plannings-eenheid is het klantbezoek: auto's van één bezoek (zelfde locatie, tijdvak) blijven bij elkaar en gaan naar één collega die het hele bezoek kan doen.
       Past dat nergens, dan blijft het bezoek onbemand (met reden), in plaats van de auto's over collega's te verdelen. Bestaande routes worden niet omgegooid. */
    const ws=D.workers.filter(x=>avail(x,d)&&x.id!==wid),R={};D.workers.forEach(x=>R[x.id]=[...(P.routes[x.id]||[])]);
    /* Bezoeken volgen de oorspronkelijke route: opeenvolgende auto's op dezelfde locatie vormen één bezoek (ook als elke auto een eigen tijdvak had) */
    for(const G of blocksOf(day.aff).map(b=>b.ids)){
      G.sort((a,b)=>(+JOB[b].priority||2)-(+JOB[a].priority||2));
      let best=null;
      for(const A of ws){if(G.some(id=>!skillOk(A,JOB[id])))continue;const b=bestPos(A,R[A.id],G,true);if(b){const c=costOf(b.s);if(!best||c<best.c)best={w:A.id,arr:b.arr,c}}}
      if(best){R[best.w]=best.arr;G.forEach(id=>P.pinned[id]=best.w)}
    }
    Object.assign(P.routes,R);P.edited=Date.now();if(!P.auto)P.auto=Date.now();
  }
  (D.sickLog||[]).forEach(x=>delete x.snap);
  const entry={id:uid('s'),wid,from,to,note,at:Date.now(),orig:Object.fromEntries(days.map(x=>[x.date,x.aff])),before:Object.fromEntries(days.map(x=>[x.date,x.before])),snap};
  entry.type=opts.rec?opts.rec.type:(opts.type||'ziek');D.sickLog=(D.sickLog||[]).concat(entry).slice(-50);SICK=entry;save();render();openSickResult();
}
function whereIs(id){const j=JOB[id];if(!j)return null;const P=D.plans[j.date];let wid=null;if(P&&P.routes)for(const k in P.routes)if(P.routes[k].includes(id))wid=k;
  if(!wid||!WRK[wid])return{date:j.date};const s=simulate(WRK[wid],P.routes[wid],j.date),g=s.seg.find(x=>x.k==='job'&&x.id===id);return{date:j.date,wid,start:g?g.a:null,late:g&&g.late}}
function openSickResult(){
  const K=SICK;if(!K)return;const w=WRK[K.wid];if(!w){SICK=null;return}FORM=null;PROP=null;
  let tot=0,ok=0;const unGroups=[];
  const sections=sickDays(K).filter(x=>x.aff.length).map(day=>{
    const d=day.date,P=getPlan(d),groups={};day.aff.forEach(id=>{const j=JOB[id];if(j)(groups[j.locationId]=groups[j.locationId]||[]).push(id)});
    const rows=Object.entries(groups).map(([lid,ids])=>{const l=LOC[lid]||{},cu=CUS[l.customerId]||{};tot+=ids.length;
      const pl=ids.map(whereIs),byW={};ids.forEach((id,i)=>{const p=pl[i];if(p&&p.wid){ok++;const k=p.wid+'|'+p.date;(byW[k]=byW[k]||{p,n:0}).n++}});
      const res=Object.values(byW).map(({p,n})=>`<span class="chip ${p.late?'warn':'ok'}"><i class="dot" style="background:${wc(WRK[p.wid])}"></i>${esc(WRK[p.wid].name)}${p.date!==d?' '+esc(fdate(p.date,{weekday:'short',day:'numeric',month:'short'})):''} ${p.start!=null?m2t(p.start):''}${n<ids.length?` (${n})`:''}</span>`).join(' ');
      const un=ids.filter((id,i)=>!(pl[i]&&pl[i].wid));if(un.length)unGroups.push({date:JOB[un[0]].date,ids:un,lid});
      const win=[...new Set(ids.map(id=>JOB[id]).map(j=>j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:'hele dag'))].join(', ');
      return`<tr><td><b>${esc(cu.name||'')}</b><div class="small muted">${esc(l.city||'')}</div></td><td>${ids.map(id=>plateBtn(JOB[id])).join(' ')}</td><td class="small mono">${esc(win)}</td><td>${res}${un.length?` <span class="chip bad">⚠️ niet herpland: geen medewerker heeft ${un.length} auto${un.length>1?"'s":''} (${un.reduce((s,id)=>s+(JOB[id]?jobDur(JOB[id]):0),0)} min) aaneengesloten ruimte</span> <button class="btn sm" data-act="propose" data-ids="${un.join(',')}">${I.auto} Slim voorstel</button>`:''}</td></tr>`}).join('');
    const load=Object.keys(P.routes).filter(x=>WRK[x]&&x!==K.wid).map(x=>{const b=day.before[x],a=simulate(WRK[x],P.routes[x],d);const extra=(a.serv+a.trav)-(b||0);return extra>.5?`${esc(WRK[x].name)} +${fdur(extra)} (terug ${m2t(a.finish)})`:''}).filter(Boolean).join(' · ');
    return`<h4 class="ph">${esc(fdate(d,{weekday:'long',day:'numeric',month:'long'}))}</h4><div class="tbl-wrap"><table><thead><tr><th>Klant</th><th>Auto's</th><th>Tijdvak</th><th>Nieuwe planning</th></tr></thead><tbody>${rows}</tbody></table></div>${load?`<p class="small muted" style="margin:6px 0 0">Extra werk voor collega's: ${load}</p>`:''}`}).join('');
  K.unGroups=unGroups;const mode=aiMode(),kb=!K.type||K.type==='ziek'?'Ziekmelding':'Afwezigheid';
  const period=K.from===K.to?fdate(K.from,{weekday:'long',day:'numeric',month:'long'}):`${fdate(K.from,{day:'numeric',month:'short'})} t/m ${fdate(K.to,{day:'numeric',month:'short'})}`;
  $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="skT" style="width:min(920px,100%)"><h3 id="skT">${K.type&&K.type!=='ziek'&&ABS[K.type]?esc(ABS[K.type].name)+': ':'Ziekmelding '}${esc(w.name)}</h3>
    <p class="note">${esc(K.note)} · ${esc(period)}. ${tot?`<b>${ok} van ${tot}</b> auto's zijn ingepland bij collega's en vastgezet.`:'Er stonden geen afspraken op deze dag(en).'}${SERVER&&tot?' Publiceer daarna opnieuw, zodat de collega’s het in hun app zien.':''}</p>
    ${sections}
    ${unGroups.length?`<h4 class="ph">Plan voor wat niet past</h4><div id="sickAi"><p class="small muted" id="sickNote" style="margin:0 0 8px">${mode?`Claude kiest voor ${unGroups.length===1?'de afspraak':`elk van de ${unGroups.length} afspraken`} die niet past het beste alternatief: een ander tijdstip, een andere dag of een collega die incidenteel langer werkt. Daarna pas je het met één klik toe.`:'AI-advies is hier niet beschikbaar. Gebruik per afspraak het Slim voorstel.'}</p>${mode?`<div class="row"><button class="btn primary" id="sickBtn" data-act="sickai">${I.auto} Laat Claude een plan maken</button></div>`:''}<div id="sickOut"></div></div>`:tot?'<p class="ok-line">Alle afspraken zijn herverdeeld.</p>':''}
    <div class="dlg-foot">${K.snap?`<button class="btn danger" data-act="sickundo">${kb} terugdraaien</button>`:`<button class="btn danger" data-act="unsick" data-id="${K.wid}">${kb} intrekken</button>`}<span class="sp"></span>${SERVER&&tot?`<button class="btn" data-act="publish">${I.send} Publiceer naar medewerker-app</button>`:''}<button class="btn primary" data-act="sickclose">${unGroups.length?'Sluiten, later verder':'Klaar'}</button></div>
    <p class="hint" style="margin-top:10px">${K.snap?`<b>${kb} terugdraaien</b> maakt ${esc(w.name.split(' ')[0])} weer beschikbaar en zet de planning terug zoals die vóór ${kb==='Ziekmelding'?'de ziekmelding':'deze registratie'} was.`:`<b>${kb} intrekken</b> maakt ${esc(w.name.split(' ')[0])} weer beschikbaar en kan de oorspronkelijke afspraken terugzetten.`}${SERVER&&tot?' <b>Publiceer</b> stuurt de nieuwe ritten naar de telefoons van de collega\u2019s.':''} <b>${unGroups.length?'Sluiten, later verder':'Klaar'}</b> bewaart alles zoals het nu is; je opent dit overzicht later weer via de melding bovenaan Planning of de knop "${kb} bekijken" bij ${esc(w.name.split(' ')[0])}.</p></div>`;
  $('#modal').hidden=false;if(SICKAI[K.id])renderSickAI();
}


const SICKAI={};
const sickDays=K=>Object.keys(K.orig||{}).sort().map(d=>({date:d,aff:(K.orig[d]||[]).filter(id=>JOB[id]),before:(K.before||{})[d]||{}}));
const stillSick=(K,d)=>{const w=WRK[K.wid];return!!w&&(w.absent||[]).includes(d)};
function sickOpenCount(K){let n=0;for(const day of sickDays(K)){if(!stillSick(K,day.date))continue;for(const id of day.aff){const p=whereIs(id);if(p&&!p.wid&&p.date>=todayIso())n++}}return n}
function latestSick(wid){return[...(D.sickLog||[])].reverse().find(x=>x.wid===wid&&WRK[x.wid]&&x.to>=todayIso()&&Object.keys(x.orig||{}).some(d=>d>=todayIso()&&stillSick(x,d)))}
function sickBanner(){
  const seen={},items=[];
  for(const K of [...(D.sickLog||[])].reverse()){if(seen[K.wid]||!WRK[K.wid]||K.to<todayIso())continue;seen[K.wid]=1;const n=sickOpenCount(K);if(n)items.push({K,n})}
  if(!items.length)return'';
  return items.map(({K,n})=>`<section class="panel sickbar"><div class="row"><span class="abschip" style="--ac:${absVar(K.type||'ziek')}">${esc((ABS[K.type||'ziek']||ABS.ziek).name)}</span><b>${esc(WRK[K.wid].name)}</b><span>${esc(K.from===K.to?fdate(K.from,{weekday:'short',day:'numeric',month:'short'}):fdate(K.from,{day:'numeric',month:'short'})+' t/m '+fdate(K.to,{day:'numeric',month:'short'}))}: <b>${n}</b> ${n===1?'auto is':"auto's zijn"} nog niet herpland.</span><span class="sp"></span><button class="btn sm primary" data-act="sickview" data-id="${K.id}">Bekijken en herplannen</button></div></section>`).join('');
}
/* Ziekmelding later intrekken: medewerker weer beschikbaar maken en eventueel de oorspronkelijke afspraken terugzetten */
function sickDates(w){return(D.absences||[]).filter(a=>a.wid===w.id&&a.type==='ziek'&&!a.part).flatMap(absDates).sort()}
function sickBtns(w,date){const ds=sickDates(w).filter(d=>d>=todayIso()||d===date),lg=latestSick(w.id);
  return`<button class="btn sm" data-act="sick" data-id="${w.id}">Ziek melden</button>${lg?`<button class="btn sm" data-act="sickview" data-id="${lg.id}">${!lg.type||lg.type==='ziek'?'Ziekmelding':'Afwezigheid'} bekijken</button>`:''}${ds.length?`<button class="btn sm" data-act="unsick" data-id="${w.id}" title="Ziek gemeld: ${esc(ds.map(d=>fdate(d,{day:'numeric',month:'short'})).join(', '))}">Ziekmelding intrekken</button>`:''}`}
function openUnsick(wid){
  const w=WRK[wid];if(!w)return;const ds=sickDates(w);if(!ds.length){toast(`Er staat geen ziekmelding voor ${w.name}.`);return}
  const cur=ds.includes(S.date)?S.date:(ds.find(d=>d>=todayIso())||ds[0]);let from=cur,to=cur;while(ds.includes(addDays(from,-1)))from=addDays(from,-1);while(ds.includes(addDays(to,1)))to=addDays(to,1);
  openForm({title:`Ziekmelding ${w.name} intrekken`,note:`Ziek gemeld op: ${ds.map(d=>fdate(d,{weekday:'short',day:'numeric',month:'short'})).join(', ')}.`,
    fields:[{k:'from',label:'Vanaf',type:'date',req:1},{k:'to',label:'Tot en met',type:'date',req:1},
      {k:'mode',label:'Afspraken',type:'select',wide:1,options:[['orig',`Oorspronkelijke afspraken terugzetten bij ${w.name.split(' ')[0]}`],['keep','Alleen weer beschikbaar maken; de huidige verdeling blijft staan']]}],
    values:{from,to,mode:'orig'},okLabel:'Intrekken',
    onSave:v=>{if(v.to<v.from)return'"Tot en met" moet op of na "Vanaf" liggen.';setTimeout(()=>unsick(wid,v.from,v.to,v.mode),0);return''}});
}
function unsick(wid,from,to,mode){
  const w=WRK[wid];let back=0,moved=0,days=0,ovr=0;
  for(let d=from;d<=to;d=addDays(d,1)){
    if(!(w.absent||[]).includes(d))continue;days++;
    removeAbsenceDates(wid,d,d);syncAbsences();
    D.workers.forEach(x=>{if(x.id!==wid&&x.overrides&&x.overrides[d]&&/Incidenteel|Extra werkdag/.test(x.overrides[d].note||''))ovr++});
    if(mode!=='orig')continue;
    const log=[...(D.sickLog||[])].reverse().find(x=>x.wid===wid&&x.orig&&x.orig[d]);if(!log)continue;
    const P=getPlan(d),ids=log.orig[d].filter(id=>JOB[id]&&JOB[id].date===d);moved+=log.orig[d].filter(id=>JOB[id]&&JOB[id].date!==d).length;
    for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>!ids.includes(id));
    P.routes[wid]=[...ids,...(P.routes[wid]||[]).filter(id=>!ids.includes(id))];ids.forEach(id=>P.pinned[id]=wid);P.edited=Date.now();if(!P.auto)P.auto=Date.now();back+=ids.length;
  }
  D.sickLog=(D.sickLog||[]).map(x=>{if(x.wid!==wid||!x.orig)return x;for(let d=from;d<=to;d=addDays(d,1)){delete x.orig[d];if(x.before)delete x.before[d]}return x}).filter(x=>x.wid!==wid||Object.keys(x.orig||{}).length);
  if(!days){toast('In deze periode stond geen ziekmelding.');return}
  save();render();
  toast(`Ziekmelding van ${w.name} ingetrokken (${days} dag${days>1?'en':''}).${mode==='orig'?` ${back} afspraken staan weer bij ${w.name.split(' ')[0]}.`:''}${moved?` ${moved} afspraak/afspraken waren al naar een andere dag verplaatst en blijven daar.`:''}${ovr?' Afwijkende werktijden van collega’s blijven staan; pas die zo nodig aan via "Werktijd deze dag".':''}${SERVER?' Publiceer opnieuw voor de medewerker-app.':''}`);
}
function sickUndo(){const K=SICK;if(!K||!K.snap)return;const s=JSON.parse(K.snap);D.jobs=s.jobs;D.plans=s.plans;D.workers=s.workers;if(s.absences)D.absences=s.absences;D.sickLog=(D.sickLog||[]).filter(x=>x.id!==K.id);delete SICKAI[K.id];index();
  SICK=null;closeForm();save();render();toast('Ziekmelding ongedaan gemaakt. De oorspronkelijke planning is terug.')}
function sickOptions(g){
  const cands=proposeFor(g.ids,g.date).map(c=>({...c}));
  const P=D.plans[g.date]||{routes:{}};
  for(const w of D.workers){const v=verdict(w,g.ids,g.date,((P.routes||{})[w.id]||[]).filter(id=>!g.ids.includes(id)));
    if(v.extend)cands.push({kind:'extend',date:g.date,wid:w.id,xstart:v.extend.start,xend:v.extend.end,extra:v.extend.extra,extraDay:v.extend.extraDay,dev:0,dtrav:0,dkm:0})}
  return cands;
}
function candText(c){const w=WRK[c.wid]||{name:'?'};
  if(c.kind==='extend')return`${w.name} ${c.extraDay?`werkt extra (${c.xstart}–${c.xend})`:`werkt incidenteel tot ${c.xend} (+${fdur(c.extra)})`}, op het gevraagde tijdstip`;
  return`${w.name}, ${fdate(c.date,{weekday:'short',day:'numeric',month:'short'})} ${m2t(c.start)}–${m2t(c.end)}${c.kind==='day'?' (andere dag)':c.dev>.5?` (${fdur(c.dev)} ${c.early?'eerder':'later'} dan tijdvak)`:''}`}
async function sickAI(){
  const K=SICK,mode=aiMode();if(!K||!mode||!K.unGroups.length)return;const out=$('#sickOut'),btn=$('#sickBtn'),note=$('#sickNote');
  const groups=K.unGroups.map(g=>({...g,opts:sickOptions(g)}));
  const data=groups.map((g,gi)=>{const l=LOC[g.lid]||{},cu=CUS[l.customerId]||{},js=g.ids.map(id=>JOB[id]);
    return{groep:gi+1,klant:cu.name,plaats:l.city,datum:fdate(g.date,{weekday:'long',day:'numeric',month:'long'}),kentekens:js.map(j=>j.plate),tijdvak:[...new Set(js.map(j=>(j.from||'?')+'-'+(j.to||'?')))].join(', '),
      opties:g.opts.map((c,i)=>({optie:i+1,soort:c.kind==='shift'?'zelfde dag, ander tijdstip':c.kind==='day'?'andere dag, zelfde tijdvak':'collega werkt incidenteel langer, op gevraagde tijdstip',omschrijving:candText(c),afwijking_tijdvak_min:Math.round(c.dev||0),extra_rijtijd_min:Math.round(c.dtrav||0),extra_werktijd_min:c.kind==='extend'?c.extra:0}))}});
  const prompt=`Je bent ervaren planner bij een bedrijf dat auto's reinigt op de locatie van klanten. Medewerker ${WRK[K.wid].name} heeft zich ziek gemeld (${K.from} t/m ${K.to}). De meeste afspraken zijn al herverdeeld; de afspraken hieronder passen nog niet. De planningssoftware heeft per afspraak de mogelijke opties doorgerekend. Kies per groep precies één optie uit de lijst en verzin niets anders.

Afwegingen, in volgorde: de afspraak met de klant zo veel mogelijk nakomen (zelfde dag en tijdvak), daarna zo weinig mogelijk overwerk, daarna zo weinig mogelijk extra rijtijd. Een collega incidenteel langer laten werken is acceptabel als het om maximaal circa een uur gaat. Een andere dag is de laatste keus. Groepen zonder opties sla je over.

Groepen (JSON):
${JSON.stringify(data.filter(g=>g.opties.length))}

Antwoord met alleen een JSON-object, in het Nederlands:
{"samenvatting":"<2 tot 3 zinnen voor de planner>","keuzes":[{"groep":<nummer>,"optie":<nummer>,"waarom":"<1 korte zin>"}],"berichten":[{"groep":<nummer>,"bericht":"<kort, vriendelijk bericht aan de klant (max 50 woorden), alleen als datum of tijd verandert>"}]}`;
  AICTL=new AbortController();btn.disabled=true;out.className='ai-out';out.hidden=false;out.textContent='Claude maakt een plan…';
  let res=null,raw='';
  try{if(mode==='claude')res=await SAMPLE.json(prompt,{signal:AICTL.signal});else{raw=await serverAI(prompt,AICTL.signal);const a=raw.indexOf('{'),b=raw.lastIndexOf('}');res=JSON.parse(raw.slice(a,b+1))}}
  catch(err){const e=err&&err.name==='AbortError'?{code:'cancelled'}:err instanceof SyntaxError?{code:'invalid_json'}:(err||{});
    const msg={not_granted:'Je hebt Claude niet toegestaan voor deze pagina.',rate_limited:'Even te veel verzoeken of je tegoed is op. Probeer het later opnieuw.',invalid_json:'Het plan kwam niet in de verwachte vorm. Klik nog een keer.',pw:'Vul het app-wachtwoord in (via AI-advies of publiceren) en probeer opnieuw.',nofn:'De AI-functie is niet gevonden op deze site.',srv:e.message||'De AI-functie gaf geen antwoord.'};
    out.textContent=e.code==='cancelled'?'':(msg[e.code]||'Het plan kon niet worden gemaakt. Probeer het opnieuw.');btn.disabled=false;AICTL=null;return}
  btn.disabled=false;AICTL=null;
  const picks=(res.keuzes||[]).map(k=>({g:Math.round(+k.groep)-1,o:Math.round(+k.optie)-1,why:String(k.waarom||'')})).filter(k=>groups[k.g]&&groups[k.g].opts[k.o]);
  const msgs={};(res.berichten||[]).forEach(m=>{const g=Math.round(+m.groep)-1;if(groups[g]&&m.bericht)msgs[g]=String(m.bericht)});
  SICKAI[K.id]={summary:String(res.samenvatting||''),groups,picks,msgs,done:{}};renderSickAI();
}
function renderSickAI(){
  const K=SICK,A=K&&SICKAI[K.id],out=$('#sickOut');if(!A||!out)return;out.hidden=false;out.className='ai-out ai-card';
  const open=A.picks.filter(p=>!A.done[p.g]);
  out.innerHTML=`<div class="row"><span class="chip acc">${I.auto} AI-plan</span>${A.summary?`<span>${esc(A.summary)}</span>`:''}</div>
    ${A.picks.map(p=>{const g=A.groups[p.g],c=g.opts[p.o],l=LOC[g.lid]||{},cu=CUS[l.customerId]||{};
      return`<div class="ai-alt"><div class="row"><b>${esc(cu.name||'')}</b><span class="muted small">${esc(l.city||'')}</span>${g.ids.map(id=>plateHtml(JOB[id].plate)).join(' ')}<span class="sp"></span>${A.done[p.g]?`<span class="chip ok">${I.check} Toegepast</span>`:`<button class="btn sm primary" data-act="sickapply" data-g="${p.g}">Toepassen</button>`}</div>
        <p><b>${esc(candText(c))}</b>${p.why?' — '+esc(p.why):''}</p>
        ${A.msgs[p.g]?`<div class="ai-msg" style="border:0;padding:0"><p>${esc(A.msgs[p.g])}</p><button class="btn sm" data-act="sickcopy" data-g="${p.g}">${I.copy} Kopieer bericht</button></div>`:''}</div>`}).join('')}
    ${A.picks.length<A.groups.length?`<p class="small muted">Voor ${A.groups.length-A.picks.length} afspraak/afspraken kon Claude geen optie kiezen. Gebruik daarvoor het Slim voorstel.</p>`:''}
    ${open.length>1?`<div class="row"><button class="btn primary" data-act="sickapplyall">${I.check} Alles toepassen (${open.length})</button></div>`:''}`;
}
function sickApply(gs){
  const A=SICK&&SICKAI[SICK.id];if(!A)return;let n=0;
  for(const gi of gs){const p=A.picks.find(x=>x.g===gi);if(!p||A.done[gi])continue;const g=A.groups[gi];applyCand(g.ids,g.date,g.opts[p.o]);A.done[gi]=1;n++}
  save();render();openSickResult();toast(`${n} afspraak/afspraken ingepland volgens het AI-plan en vastgezet.`);
}

/* AI-route: binnen Claude via de sample-capability, op een eigen site (bijv. Netlify) via de serverfunctie /api/ai-advies met de API-sleutel uit de omgeving */
function aiMode(){if(SAMPLE)return'claude';try{if(!window.claude&&/^https?:$/.test(location.protocol))return'server'}catch(e){}return null}
const PWKEY='wasroute.aipw';
let PWMEM='';
try{localStorage.removeItem(PWKEY)}catch(e){}
const PWKEEP='wasroute.pwkeep';
/* keep: true = ook op deze computer onthouden, false = alleen deze sessie, undefined = bestaande keuze volgen */
const pwStore=(v,keep)=>{try{if(v)sessionStorage.setItem(PWKEY,v);else sessionStorage.removeItem(PWKEY)}catch(e){}
  try{if(!v||keep===false)localStorage.removeItem(PWKEEP);else if(keep===true||localStorage.getItem(PWKEEP))localStorage.setItem(PWKEEP,v)}catch(e){}};
/* Foto bij oplevering van één afspraak bekijken (proof of delivery) */
async function showFoto(date,id){
  try{
    const r=await fetch(`/api/foto?date=${encodeURIComponent(date)}&jobId=${encodeURIComponent(id)}`,{cache:'no-store',headers:{'x-app-password':getPw()}});
    if(r.status===404){toast('Nog geen foto bij deze afspraak.');return}
    if(!r.ok){toast(r.status===401?'Wachtwoord klopt niet.':'Foto niet opgehaald.');return}
    const url=URL.createObjectURL(await r.blob());
    $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" style="width:min(720px,100%)"><h3>Foto bij oplevering</h3><img src="${url}" alt="Foto bij oplevering" style="width:100%;border-radius:8px"><div class="dlg-foot"><span class="sp"></span><button type="button" class="btn" data-act="dlgx">Sluiten</button></div></div>`;
    $('#modal').hidden=false;
  }catch(e){toast('Foto niet opgehaald.')}
}
function getPw(){if(PWMEM)return PWMEM;let v='';try{v=sessionStorage.getItem(PWKEY)||localStorage.getItem(PWKEEP)||''}catch(e){}if(!v){const el=$('#aiPw');if(el&&el.value)v=el.value}if(v)PWMEM=v;return v}
/* Een bewaard wachtwoord dat de server afwijst, overal weggooien (ook in andere tabbladen) */
function pwForget(bad){if(bad&&getPw()!==bad)return;PWMEM='';try{sessionStorage.removeItem(PWKEY);if(!bad||localStorage.getItem(PWKEEP)===bad)localStorage.removeItem(PWKEEP)}catch(e){}try{PWBC&&PWBC.postMessage({forget:bad||''})}catch(e){}}
/* Open tabbladen delen het wachtwoord, zodat een nieuw tabblad er niet opnieuw om vraagt */
let PWBC=null;try{PWBC=new BroadcastChannel('wasroute.pw')}catch(e){}
if(PWBC){PWBC.onmessage=e=>{const m=e.data||{};
  if(m.q){const v=getPw();if(v)PWBC.postMessage({pw:v})}
  else if(m.pw&&(m.force||!getPw())){PWMEM=m.pw;try{sessionStorage.setItem(PWKEY,m.pw);if(m.force&&localStorage.getItem(PWKEEP))localStorage.setItem(PWKEEP,m.pw)}catch(x){}}
  else if(m.forget!=null){if(!m.forget||PWMEM===m.forget){PWMEM='';try{sessionStorage.removeItem(PWKEY)}catch(x){}}}
  else if(m.logout){PWMEM='';try{sessionStorage.removeItem(PWKEY)}catch(x){}}};
  if(!getPw())PWBC.postMessage({q:1})}
function peerPw(){return new Promise(res=>{if(getPw()||!PWBC)return res(getPw());PWBC.postMessage({q:1});let t=0;const iv=setInterval(()=>{if(getPw()||++t>10){clearInterval(iv);res(getPw())}},50)})}
function logoutPw(){PWMEM='';pwStore('');const el=$('#aiPw');if(el)el.value='';try{localStorage.removeItem(PWKEY);localStorage.removeItem(PWKEEP)}catch(e){}try{PWBC&&PWBC.postMessage({logout:1})}catch(e){}toast('Uitgelogd. Bij de volgende actie die het wachtwoord nodig heeft, vraagt de app er opnieuw om.')}
async function serverAI(prompt,signal){
  const r=await fetch('/api/ai-advies',{method:'POST',headers:{'content-type':'application/json','x-app-password':getPw()},body:JSON.stringify({prompt}),signal});
  let d={};try{d=await r.json()}catch(e){}
  if(r.status===401){const el=$('#aiPw');if(el){el.hidden=false;el.focus()}throw{code:'pw'}}
  if(r.status===404)throw{code:'nofn'};
  if(!r.ok||!d.text)throw{code:'srv',message:d.error};
  {const el=$('#aiPw');if(el&&el.value)pwStore(el.value)}
  return d.text;
}
async function askAI(){
  const mode=aiMode();if(!mode||!PROP)return;const out=$('#aiOut'),btn=$('#aiBtn'),stop=$('#aiStop'),note=$('#aiNote');
  const ids=PROP.ids,j0=JOB[ids[0]],l=LOC[j0.locationId]||{},cu=CUS[l.customerId]||{},N=PROP.cands.length;
  const opts=PROP.cands.map((c,i)=>({optie:i+1,soort:c.kind==='shift'?'zelfde dag, ander tijdstip':'andere dag, zelfde tijdvak',datum:fdate(c.date,{weekday:'long',day:'numeric',month:'long'}),medewerker:WRK[c.wid].name,standplaats:WRK[c.wid].city,tijd:m2t(c.start)+'-'+m2t(c.end),afwijking_van_tijdvak_min:Math.round(c.dev),richting:c.dev<.5?'binnen tijdvak':(c.early?'eerder':'later'),extra_rijtijd_min:Math.round(c.dtrav),extra_km:Math.round(c.dkm)}));
  const win=ids.map(id=>JOB[id]).map(j=>j.from||j.to?(j.from||'?')+'-'+(j.to||'?'):'hele dag').join(', ');
  const prompt=`Je bent ervaren planner bij een bedrijf dat auto's reinigt op de locatie van klanten. Een afspraak past niet goed in de planning. De planningssoftware heeft de mogelijke opties doorgerekend. Kies alleen uit deze opties en verzin geen andere tijden, datums of medewerkers.

Afspraak:
- Klant: ${cu.name}${cu.contact?' (contactpersoon '+cu.contact+')':''}
- Adres: ${[l.address,l.postcode,l.city].filter(Boolean).join(', ')}
- Voertuig(en): ${ids.map(id=>JOB[id].plate).join(', ')}
- Gewenste datum: ${fdate(PROP.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
- Tijdvak klant: ${win}
- Probleem: ${PROP.reason}
- Werkafspraak: medewerkers zijn op hun begintijd bij de eerste klant.

Opties (JSON):
${JSON.stringify(opts)}

Weeg: zo dicht mogelijk bij de gewenste datum en het tijdvak van de klant, daarna zo weinig mogelijk extra rijtijd en kilometers.
Antwoord met alleen een JSON-object, zonder andere tekst, in het Nederlands, kort en zakelijk:
{"aanbevolen": <optienummer>, "waarom": "<maximaal 2 zinnen>", "alternatief": <optienummer of null>, "alternatief_waarom": "<1 zin of lege tekst>", "bericht_klant": "<vriendelijk conceptbericht aan de klant van maximaal 60 woorden dat de aanbevolen datum en tijd voorstelt>"}`;
  AICTL=new AbortController();btn.disabled=true;stop.hidden=false;out.hidden=false;out.className='ai-out';out.textContent='Claude denkt na…';note.textContent='';
  let res=null,raw='';
  try{
    if(mode==='claude')res=await SAMPLE.json(prompt,{signal:AICTL.signal});
    else{raw=await serverAI(prompt,AICTL.signal);const a=raw.indexOf('{'),b=raw.lastIndexOf('}');res=JSON.parse(raw.slice(a,b+1))}
  }catch(err){
    const e=err&&err.name==='AbortError'?{code:'cancelled'}:err instanceof SyntaxError?{code:'invalid_json',text:raw}:(err||{});
    out.textContent=e.code==='invalid_json'?(e.text||''):'';out.hidden=!out.textContent;
    const msg={not_granted:'Je hebt Claude niet toegestaan voor deze pagina.',sampling_disabled:'Claude is niet beschikbaar voor dit account.',rate_limited:'Even te veel verzoeken of je tegoed is op. Probeer het later opnieuw.',session_expired:'Log opnieuw in bij Claude en probeer het nog eens.',refused:'Claude kon hier geen advies over geven.',invalid_json:'Het advies kwam niet in de verwachte vorm. Klik nog een keer op de knop.',pw:'Vul het app-wachtwoord in en klik opnieuw op de knop.',nofn:'De AI-functie is niet gevonden op deze site. Deploy de site via GitHub, inclusief de map netlify/functions.',srv:e.message?'AI-functie gaf een fout: '+e.message:'De AI-functie gaf geen antwoord. Controleer de API-sleutel in Netlify.'};
    if(e.code!=='cancelled')note.textContent=msg[e.code]||'Het advies kon niet worden opgehaald. Probeer het opnieuw.';
    if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code))btn.hidden=true;
    btn.disabled=false;stop.hidden=true;AICTL=null;return;
  }
  btn.disabled=false;stop.hidden=true;AICTL=null;
  const rec=Math.round(+res.aanbevolen),alt=res.alternatief==null?NaN:Math.round(+res.alternatief);
  if(!(rec>=1&&rec<=N)){out.textContent='Claude koos geen geldige optie. Klik nog een keer op de knop of kies zelf een optie hierboven.';return}
  PROP.ai={rec:rec-1,alt:alt>=1&&alt<=N&&alt!==rec?alt-1:-1,msg:String(res.bericht_klant||'')};
  const desc=i=>{const c=PROP.cands[i];return`${esc(WRK[c.wid].name)}, ${esc(fdate(c.date,{weekday:'short',day:'numeric',month:'short'}))} ${m2t(c.start)}–${m2t(c.end)}`};
  out.className='ai-out ai-card';
  out.innerHTML=`<div class="ai-pick"><div class="row"><span class="chip acc">${I.auto} AI-advies</span><b>Optie ${rec}: ${desc(rec-1)}</b></div>
      <p>${esc(res.waarom||'')}</p><button class="btn primary" data-act="papply" data-i="${rec-1}">${I.check} Plan volgens advies</button></div>
    ${PROP.ai.alt>=0?`<div class="ai-alt"><div class="row"><b>Alternatief, optie ${PROP.ai.alt+1}: ${desc(PROP.ai.alt)}</b></div>${res.alternatief_waarom?`<p>${esc(res.alternatief_waarom)}</p>`:''}<button class="btn sm" data-act="papply" data-i="${PROP.ai.alt}">Plan dit alternatief</button></div>`:''}
    ${PROP.ai.msg?`<div class="ai-msg"><b>Conceptbericht aan de klant</b><p>${esc(PROP.ai.msg)}</p><button class="btn sm" data-act="copymsg">${I.copy} Kopieer bericht</button></div>`:''}`;
  document.querySelectorAll('.prop').forEach((el,i)=>{el.classList.toggle('ai',i===rec-1);const t=el.querySelector('.ai-tag');if(t)t.hidden=i!==rec-1});
}

