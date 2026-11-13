/* ---------- archief (fase 1): gereed gemelde bezoeken kopiëren naar het archief. Niets wordt uit de planning verwijderd. ---------- */
const ARCH_KEY='wasroute.archief';
const ARCH_PERIODES=['week','maand','kwartaal','jaar'];
function isoWeekKey(date){
  const d=new Date(date+'T12:00:00'), dag=(d.getDay()+6)%7;      // ma=0 ... zo=6
  d.setDate(d.getDate()-dag+3);                                    // donderdag van dezelfde week
  const jaar=d.getFullYear(), eerste=new Date(jaar,0,4), eDag=(eerste.getDay()+6)%7;
  eerste.setDate(eerste.getDate()-eDag+3);
  const week=1+Math.round((d-eerste)/864e5/7);
  return jaar+'-W'+String(week).padStart(2,'0');
}
function periodeSleutel(date,periode){
  if(periode==='week')return isoWeekKey(date);
  if(periode==='kwartaal')return date.slice(0,4)+'-Q'+(Math.floor((+date.slice(5,7)-1)/3)+1);
  if(periode==='jaar')return date.slice(0,4);
  return date.slice(0,7);                                          // maand
}
function archiefLezen(periode){
  let a=[];try{a=JSON.parse(localStorage.getItem(ARCH_KEY)||'[]')}catch(e){}
  return periode?a.filter(x=>x.periode===periode):a;
}
function archiefPeriodes(){
  const t={};archiefLezen().forEach(x=>{const k=x.periode;t[k]=(t[k]||0)+1});
  return t;
}
let ARCH_LAST='';
let ARCH_VIEW={periode:'week',sleutels:null,key:'',items:null,laden:false};
const ARCH_STATUS_TXT={done:'Gereed',issue:'Probleem',open:'Geen melding'};
async function archiefSleutels(periode){
  if(SERVER){const r=await withPw(()=>api('/api/archief?periode='+periode));return r.sleutels||[]}
  const t=new Set(archiefLezen().filter(x=>x.periodeType===periode).map(x=>x.periode));
  return[...t].sort();
}
async function archiefItems(periode,key){
  if(SERVER){const r=await withPw(()=>api('/api/archief?periode='+periode+'&key='+encodeURIComponent(key)));return r.items||[]}
  return archiefLezen().filter(x=>x.periodeType===periode&&x.periode===key);
}
async function archiefKiesPeriode(periode){
  ARCH_VIEW={periode,sleutels:null,key:'',items:null,laden:true};render();
  try{ARCH_VIEW.sleutels=await archiefSleutels(periode)}catch(e){ARCH_VIEW.sleutels=[];toast('Archief laden mislukt: '+(e.message||e.code||'fout'),5000)}
  ARCH_VIEW.laden=false;render();
}
async function archiefKiesSleutel(key){
  if(!key){ARCH_VIEW.key='';ARCH_VIEW.items=null;render();return}
  ARCH_VIEW.key=key;ARCH_VIEW.items=null;ARCH_VIEW.laden=true;render();
  try{ARCH_VIEW.items=await archiefItems(ARCH_VIEW.periode,key)}catch(e){ARCH_VIEW.items=[];toast('Archief laden mislukt: '+(e.message||e.code||'fout'),5000)}
  ARCH_VIEW.laden=false;render();
}
function archiefViewerHtml(){
  const v=ARCH_VIEW;
  const knoppen=ARCH_PERIODES.map(p=>{const aan=v.periode===p;return `<button class="fchip${aan?' on':''}" data-act="archper" data-periode="${p}" aria-pressed="${aan}" style="${aan?'font-weight:700;box-shadow:inset 0 0 0 2px currentColor':''}">${aan?'✓ ':''}${p}</button>`}).join('');
  let lijst='';
  if(v.laden&&!v.items)lijst='<p class="small muted">Laden…</p>';
  else if(v.sleutels&&!v.key){
    lijst=v.sleutels.length?`<div class="row" style="gap:6px;flex-wrap:wrap">${v.sleutels.map(k=>`<button class="btn sm" data-act="archkey" data-key="${esc(k)}">${esc(k)}</button>`).join('')}</div>`:'<p class="small muted">Nog niets gearchiveerd voor deze periode.</p>';
  }
  if(v.key&&v.items){
    const rijen=v.items.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.medewerker).localeCompare(String(b.medewerker)));
    lijst=`<p class="small muted">${esc(v.key)}: ${rijen.length} bezoeken. Alleen-lezen: wijzigingen hier veranderen de planning niet.</p>
      <div style="overflow:auto;max-height:340px"><table class="tbl"><thead><tr><th>Datum</th><th>Medewerker</th><th>Klant</th><th>Locatie</th><th>Kenteken</th><th>Type</th><th>Melding</th><th>Reden</th></tr></thead><tbody>
      ${rijen.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.medewerker||'')}</td><td>${esc(x.klant||'')}</td><td>${esc(x.locatie||'')}</td><td>${esc((x.job||{}).plate||'')}</td><td>${esc((x.job||{}).type||'')}</td><td>${esc(ARCH_STATUS_TXT[(x.melding||{}).st]||(x.melding||{}).st||'')}</td><td>${esc((x.melding||{}).reden||'')}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="archkey" data-key="">← Terug naar de periodes</button></div>`;
  }
  return `<p class="small" style="margin:10px 0 4px"><b>Archief bekijken per: ${esc(v.periode)}</b></p><div class="row" style="gap:6px;flex-wrap:wrap">${knoppen}</div><div style="margin-top:8px">${lijst}</div>`;
}
function archiefHtml(){
  const dagen=D.settings.bewaarDagen||60;
  return `<div class="row" style="gap:8px;flex-wrap:wrap">${ARCH_PERIODES.map(p=>`<button class="btn" data-act="archiefnu" data-periode="${p}">Archiveer gereed per ${p}</button>`).join('')}</div>
  <p class="small muted">${esc(ARCH_LAST||'Nog niet gearchiveerd in deze sessie.')}</p>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px;align-items:flex-end">
    <label class="fld"><span>Bewaren in de live planner (dagen)</span><input id="archDagen" type="number" min="7" value="${dagen}" style="width:110px"></label>
    <button class="btn" data-act="archsave">Termijn opslaan</button>
    <button class="btn" data-act="archopruim">Oude planningen opruimen</button>
  </div>
  <p class="small muted">Opruimen archiveert eerst alle bezoeken van dagen ouder dan de termijn (ook met probleem of zonder melding) en haalt die dagen daarna uit de live planner. Opdrachten blijven bestaan.</p>
  <h3 style="margin:14px 0 0">Archief bekijken</h3>
  ${archiefViewerHtml()}`;
}
function bezoekRecords(dagen,periode,alleenGereed){
  const out=[];
  for(const date of dagen){
    const P=D.plans[date]; if(!P)continue;
    const m=stMap(date);
    for(const [wid,ids] of Object.entries(P.routes||{})){
      for(const id of ids){
        const st=m[id];
        if(alleenGereed&&(!st||st.st!=='done'))continue;
        const j=JOB[id]; if(!j)continue;
        const l=LOC[j.locationId]||{}, c=CUS[l.customerId]||{};
        out.push({periode:periodeSleutel(date,periode),periodeType:periode,date,wid,medewerker:(WRK[wid]||{}).name||wid,
          job:{id:j.id,plate:j.plate,vehicle:j.vehicle||'',type:j.type,from:j.from||'',to:j.to||''},
          klant:c.name||'',locatie:l.name||'',plaats:l.city||'',
          melding:{st:st?st.st:'open',at:st?st.at||'':'',reden:st?st.reason||'':'',opmerking:st?st.note||'':''}});
      }
    }
  }
  return out;
}
async function archiveerItems(out,periode){
  if(SERVER){
    try{const r=await withPw(()=>api('/api/archief',{method:'POST',body:JSON.stringify({periode,items:out})}));return{nieuw:r.nieuw||0,totaal:Object.keys(r.periodes||{}).length+' periode(s)'}}
    catch(e){toast('Archiveren op de server mislukt: '+(e.message||e.code||'onbekende fout')+'. Er is niets verwijderd.',6000);return null}
  }
  const bestaand=archiefLezen(), sleutels=new Set(bestaand.map(x=>x.date+'|'+x.job.id));
  const nw=out.filter(x=>!sleutels.has(x.date+'|'+x.job.id));
  try{localStorage.setItem(ARCH_KEY,JSON.stringify(bestaand.concat(nw)))}catch(e){toast('Archief kon niet worden opgeslagen: de browser-opslag is vol.',6000);return null}
  return{nieuw:nw.length,totaal:'lokaal'};
}
async function archiveerGereed(periode){
  periode=ARCH_PERIODES.includes(periode)?periode:'week';
  const res=await archiveerItems(bezoekRecords(Object.keys(D.plans||{}),periode,true),periode);
  if(!res)return null;
  ARCH_LAST=`Laatste archivering per ${periode}: ${res.nieuw} nieuwe gereed gemelde bezoeken (${res.totaal}), om ${hm(Date.now())}.`;
  toast(`${res.nieuw} gereed gemelde bezoeken gearchiveerd per ${periode}. De planning is ongewijzigd.`,6000);
  if(S.tab==='instellingen')render();
  return res;
}
function archiefTermijnOpslaan(){
  const v=Math.max(7,parseInt(($('#archDagen')||{}).value,10)||60);
  D.settings.bewaarDagen=v;save();toast(`Bewaartermijn ingesteld op ${v} dagen.`,4000);if(S.tab==='instellingen')render();
}
async function archiefOpruimen(){
  const dagen=D.settings.bewaarDagen||60;
  const cutoff=addDays(todayIso(),-dagen);
  const kandidaten=Object.keys(D.plans||{}).filter(d=>d<cutoff&&!D.plans[d].archived);
  if(!kandidaten.length){toast(`Niets om op te ruimen: geen planningen ouder dan ${dagen} dagen.`,5000);return}
  if(!confirm(`${kandidaten.length} planningsdagen ouder dan ${dagen} dagen worden eerst volledig gearchiveerd (alle bezoeken, ook met een probleem of zonder melding) en daarna uit de live planner gehaald. De opdrachten blijven bestaan. Doorgaan?`))return;
  if(SERVER){for(const d of kandidaten)await fetchStatus(d,true)}
  const items=bezoekRecords(kandidaten,'week',false);
  const res=await archiveerItems(items,'week');
  if(!res)return;                       // archiveren mislukt: niets verwijderd
  for(const d of kandidaten){const P=D.plans[d];P.routes={};P.pinned={};P.archived=true;delete P.auto;delete P.edited}
  const zonderMelding=items.filter(x=>x.melding.st!=='done').length;
  ARCH_LAST=`Opgeruimd: ${kandidaten.length} dagen gearchiveerd (${items.length} bezoeken, ${zonderMelding} zonder gereed-melding), om ${hm(Date.now())}.`;
  save();render();
  toast(`${kandidaten.length} planningsdagen gearchiveerd en opgeruimd (${items.length} bezoeken, ${zonderMelding} zonder gereed-melding).`,7000);
}
/* Alleen voor testen: markeert alle bezoeken op een datum als gereed (lokaal). */
function testMarkeerAlleGereed(date){
  const P=D.plans[date]; if(!P){console.log('Geen planning op '+date);return 0}
  const n=Object.values(P.routes||{}).flat().length;
  return testMarkeerGereed(date,n);
}
/* Alleen voor testen: markeert de eerste n bezoeken op een datum als gereed (lokaal, niet op de server). */
function testMarkeerGereed(date,n){
  const P=D.plans[date]; if(!P){console.log('Geen planning op '+date);return}
  STATUS[date]=STATUS[date]||{map:{}};
  let teller=0;
  for(const [wid,ids] of Object.entries(P.routes||{})){
    for(const id of ids){ if(teller>=(n||3))break; STATUS[date].map[id]={st:'done',at:new Date().toISOString(),wid,name:(WRK[wid]||{}).name||wid,reason:'',note:''}; teller++ }
  }
  STATUS[date].at=Date.now();
  render();
  toast(`${teller} bezoeken op ${date} als gereed gemarkeerd (alleen lokaal).`,4000);
  return teller;
}
