/* ---------- archief: gereed gemelde bezoeken en oude planningen bewaren, en op datum terugzoeken ----------
   Opslag: één archief, intern per maand bewaard (server) of in deze browser (lokaal). Geen periodekeuze voor de gebruiker.
   Niets wordt verwijderd uit de planning tenzij "Oude planningen opruimen" dat bewust doet, nadat het archiveren is gelukt. */
const ARCH_KEY='wasroute.archief';
let ARCH_LAST='';
let ARCH_VIEW={van:'',tot:'',items:null,laden:false,fout:''};
const ARCH_STATUS_TXT={done:'Gereed',issue:'Probleem',open:'Geen melding'};

function archiefLezen(){try{return JSON.parse(localStorage.getItem(ARCH_KEY)||'[]')}catch(e){return[]}}
function eersteVanMaand(d){return d.slice(0,8)+'01'}

async function archiefOphalen(van,tot){
  if(SERVER){const r=await withPw(()=>api('/api/archief?van='+van+'&tot='+tot));return r.items||[]}
  return archiefLezen().filter(x=>x.date>=van&&x.date<=tot).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}

function bezoekRecords(dagen,alleenGereed){
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
        out.push({date,wid,medewerker:(WRK[wid]||{}).name||wid,
          job:{id:j.id,plate:j.plate,vehicle:j.vehicle||'',type:j.type,from:j.from||'',to:j.to||''},
          klant:c.name||'',locatie:l.name||'',plaats:l.city||'',
          melding:{st:st?st.st:'open',at:st?st.at||'':'',reden:st?st.reason||'':'',opmerking:st?st.note||'':''}});
      }
    }
  }
  return out;
}

// Schrijft bezoeken naar het archief. Bestaande (zelfde datum + opdracht) worden niet dubbel opgeslagen.
async function archiveerItems(out){
  if(SERVER){
    try{const r=await withPw(()=>api('/api/archief',{method:'POST',body:JSON.stringify({items:out})}));return{nieuw:r.nieuw||0,totaal:'server'}}
    catch(e){toast('Archiveren op de server mislukt: '+(e.message||e.code||'onbekende fout')+'. Er is niets verwijderd.',6000);return null}
  }
  const bestaand=archiefLezen(), bekend=new Set(bestaand.map(x=>x.date+'|'+x.job.id));
  const nw=out.filter(x=>!bekend.has(x.date+'|'+x.job.id));
  try{localStorage.setItem(ARCH_KEY,JSON.stringify(bestaand.concat(nw)))}catch(e){toast('Archief kon niet worden opgeslagen: de browser-opslag is vol.',6000);return null}
  return{nieuw:nw.length,totaal:'lokaal'};
}

async function archiveerGereed(){
  const res=await archiveerItems(bezoekRecords(Object.keys(D.plans||{}),true));
  if(!res)return null;
  ARCH_LAST=`Laatste archivering: ${res.nieuw} nieuwe gereed gemelde bezoeken, om ${hm(Date.now())}.`;
  toast(`${res.nieuw} gereed gemelde bezoeken gearchiveerd. De planning is ongewijzigd.`,6000);
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
  const items=bezoekRecords(kandidaten,false);
  const res=await archiveerItems(items);
  if(!res)return;                       // archiveren mislukt: niets verwijderd
  for(const d of kandidaten){const P=D.plans[d];P.routes={};P.pinned={};P.archived=true;delete P.auto;delete P.edited}
  const zonderMelding=items.filter(x=>x.melding.st!=='done').length;
  /* Foto's van de gearchiveerde dagen worden ook van de server gewist */
  const fotos=SERVER?await wisFotos(kandidaten):0;
  ARCH_LAST=`Opgeruimd: ${kandidaten.length} dagen gearchiveerd (${items.length} bezoeken, ${zonderMelding} zonder gereed-melding, ${fotos} foto's verwijderd), om ${hm(Date.now())}.`;
  save();render();
  toast(`${kandidaten.length} planningsdagen gearchiveerd en opgeruimd (${items.length} bezoeken, ${zonderMelding} zonder gereed-melding).`,7000);
}

async function archiefToon(){
  const van=($('#archVan')||{}).value||ARCH_VIEW.van, tot=($('#archTot')||{}).value||ARCH_VIEW.tot;
  if(!van||!tot||tot<van){toast('Kies een geldige periode: "van" moet vóór "tot" liggen.',4000);return}
  ARCH_VIEW={van,tot,items:null,laden:true,fout:''};render();
  try{ARCH_VIEW.items=await archiefOphalen(van,tot)}catch(e){ARCH_VIEW.items=[];ARCH_VIEW.fout=e.message||e.code||'fout'}
  ARCH_VIEW.laden=false;render();
}

function archiefViewerHtml(){
  const v=ARCH_VIEW;
  const van=v.van||eersteVanMaand(todayIso()), tot=v.tot||todayIso();
  let inhoud='';
  if(v.laden)inhoud='<p class="small muted">Laden…</p>';
  else if(v.fout)inhoud=`<p class="small" style="color:var(--bad)">Laden mislukt: ${esc(v.fout)}</p>`;
  else if(v.items){
    const rijen=v.items;
    inhoud=rijen.length?`<p class="small muted">${rijen.length} bezoeken van ${esc(v.van)} t/m ${esc(v.tot)}. Alleen-lezen.</p>
      <div style="overflow:auto;max-height:360px"><table class="tbl"><thead><tr><th>Datum</th><th>Medewerker</th><th>Klant</th><th>Locatie</th><th>Kenteken</th><th>Type</th><th>Melding</th><th>Reden</th></tr></thead><tbody>
      ${rijen.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.medewerker||'')}</td><td>${esc(x.klant||'')}</td><td>${esc(x.locatie||'')}</td><td>${esc((x.job||{}).plate||'')}</td><td>${esc((x.job||{}).type||'')}</td><td>${esc(ARCH_STATUS_TXT[(x.melding||{}).st]||(x.melding||{}).st||'')}</td><td>${esc((x.melding||{}).reden||'')}</td></tr>`).join('')}
      </tbody></table></div>`:`<p class="small muted">Geen bezoeken gevonden van ${esc(v.van)} t/m ${esc(v.tot)}.</p>`;
  }
  return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
    <label class="fld"><span>Van</span><input id="archVan" type="date" value="${esc(van)}"></label>
    <label class="fld"><span>Tot en met</span><input id="archTot" type="date" value="${esc(tot)}"></label>
    <button class="btn" data-act="archtoon">Toon archief</button>
  </div><div style="margin-top:10px">${inhoud}</div>`;
}

function archiefHtml(){
  const dagen=D.settings.bewaarDagen||60;
  return `<div class="row" style="gap:8px;flex-wrap:wrap">
    <button class="btn" data-act="archiefnu">Archiveer gereed gemelde bezoeken</button>
  </div>
  <p class="small muted">${esc(ARCH_LAST||'Nog niet gearchiveerd in deze sessie.')}</p>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px;align-items:flex-end">
    <label class="fld"><span>Bewaren in de live planner (dagen)</span><input id="archDagen" type="number" min="7" value="${dagen}" style="width:110px"></label>
    <button class="btn" data-act="archsave">Termijn opslaan</button>
    <button class="btn" data-act="archopruim">Oude planningen opruimen</button>
  </div>
  <p class="small muted">Opruimen archiveert eerst alle bezoeken van dagen ouder dan de termijn (ook met probleem of zonder melding) en haalt die dagen daarna uit de live planner. Opdrachten blijven bestaan.</p>
  <h3 style="margin:14px 0 6px">Archief bekijken</h3>
  ${archiefViewerHtml()}`;
}

/* Alleen voor testen: markeert bezoeken op een datum als gereed (lokaal, niet op de server). */
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
function testMarkeerAlleGereed(date){
  const P=D.plans[date]; if(!P){console.log('Geen planning op '+date);return 0}
  return testMarkeerGereed(date,Object.values(P.routes||{}).flat().length);
}
