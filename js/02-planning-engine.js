/* ---------- regels ---------- */
const jobsOn=date=>D.jobs.filter(j=>j.date===date);
const jobDur=j=>(+j.duration>0?+j.duration:(TYP[j.type]?TYP[j.type].dur:30));
const jobSkill=j=>(TYP[j.type]&&TYP[j.type].skill)||'';
const skillOk=(w,j)=>{const s=jobSkill(j);return !s||(w.skills||[]).includes(s)};
/* Incidentele afwijking van de werktijd op één datum: w.overrides[datum] = {start,end,note} */
const ovr=(w,date)=>(date&&w.overrides&&w.overrides[date])||null;
function shiftOf(w,date){const o=ovr(w,date);let start=(o&&o.start)||w.start,end=(o&&o.end)||w.end;const pa=date&&D.absences?partialAbs(w,date):null;
  if(pa){if(pa.part==='laat'&&t2m(pa.time)>t2m(start))start=pa.time;if(pa.part==='vroeg'&&t2m(pa.time)<t2m(end))end=pa.time}
  return{start,end,o:o||(pa?{start,end,note:`${(ABS[pa.type]||{}).name||'Afwezig'} (${pa.part==='laat'?'begint '+pa.time:'stopt '+pa.time})`}:null),pa}}
/* Nederlandse feestdagen: op een ingeschakelde feestdag is niemand beschikbaar */
const FD_KEYS=[['nieuwjaar','Nieuwjaarsdag'],['goedevrijdag','Goede Vrijdag'],['paasdag1','Eerste Paasdag'],['paasdag2','Tweede Paasdag'],['koningsdag','Koningsdag'],['bevrijding','Bevrijdingsdag'],['hemelvaart','Hemelvaartsdag'],['pinkster1','Eerste Pinksterdag'],['pinkster2','Tweede Pinksterdag'],['kerst1','Eerste Kerstdag'],['kerst2','Tweede Kerstdag']];
const FD_STANDAARD={nieuwjaar:true,goedevrijdag:true,paasdag1:true,paasdag2:true,koningsdag:true,bevrijding:false,hemelvaart:true,pinkster1:true,pinkster2:true,kerst1:true,kerst2:true};
const fdCfg=()=>({...FD_STANDAARD,...(D.settings.feestdagen||{})});
function paasdatum(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(Date.UTC(y,mo-1,da))}
function feestdagenJaar(y){const p=paasdatum(y),plus=n=>{const d=new Date(p);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};const kd=new Date(Date.UTC(y,3,27));if(kd.getUTCDay()===0)kd.setUTCDate(26);
  return{[`${y}-01-01`]:'nieuwjaar',[plus(-2)]:'goedevrijdag',[plus(0)]:'paasdag1',[plus(1)]:'paasdag2',[kd.toISOString().slice(0,10)]:'koningsdag',[`${y}-05-05`]:'bevrijding',[plus(39)]:'hemelvaart',[plus(49)]:'pinkster1',[plus(50)]:'pinkster2',[`${y}-12-25`]:'kerst1',[`${y}-12-26`]:'kerst2'}}
const FD_CACHE={};
function feestdagVan(date){const y=+date.slice(0,4);if(!FD_CACHE[y])FD_CACHE[y]=feestdagenJaar(y);const k=FD_CACHE[y][date];if(!k||!fdCfg()[k])return'';return FD_KEYS.find(x=>x[0]===k)[1]}
function availWhy(w,date){if((w.absent||[]).includes(date))return(w.absentNote&&w.absentNote[date])||'Afwezig';if(ovr(w,date))return'';const fdn=feestdagVan(date);if(fdn)return'Feestdag: '+fdn;if(!(w.days||[]).includes(wday(date)))return'Werkt niet op '+fdate(date,{weekday:'long'});return''}
const avail=(w,date)=>!availWhy(w,date);

/* ---------- reistijd ---------- */
const LEGS=new Map();
function hav(a,b){const R=6371,t=Math.PI/180,dl=(b.lat-a.lat)*t,dg=(b.lng-a.lng)*t;const x=Math.sin(dl/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
const wPt=w=>({key:'W'+w.id,lat:+w.lat,lng:+w.lng});
const lPt=l=>({key:'L'+l.id,lat:+l.lat,lng:+l.lng});
function leg(a,b){
  if(a.key===b.key)return{km:0,min:0};
  const k=a.key+'|'+b.key;if(LEGS.has(k))return LEGS.get(k);
  const s=D.settings;
  if(s.travelSource==='ors'&&D.ors){const v=D.ors[orsKey(a,b)];if(v){const r={km:v[0],min:Math.max(s.minTravel,Math.round(v[1])),ors:true};LEGS.set(k,r);return r}}
  const km=hav(a,b)*s.roadFactor;
  const u=Math.min(km,s.urbanKm);let min=(u/s.urbanSpeed+Math.max(km-u,0)/s.roadSpeed)*60;
  min=Math.max(s.minTravel,min);const r={km,min:Math.round(min)};LEGS.set(k,r);return r;
}

/* ---------- reistijdbron: schatting of OpenRouteService (echte rijtijden, via /api/reistijden) ---------- */
const orsKey=(a,b)=>`${(+a.lat).toFixed(5)},${(+a.lng).toFixed(5)}>${(+b.lat).toFixed(5)},${(+b.lng).toFixed(5)}`;
const useORS=()=>D.settings.travelSource==='ors';
function orsPointsFor(dates){
  const pts=new Map(),add=p=>{if(isFinite(+p.lat)&&isFinite(+p.lng))pts.set(`${(+p.lat).toFixed(5)},${(+p.lng).toFixed(5)}`,{lat:+p.lat,lng:+p.lng})};
  D.workers.forEach(w=>add(w));
  const ds=dates?new Set(dates):null,today=todayIso();
  D.jobs.forEach(j=>{if(ds?ds.has(j.date):j.date>=today){const l=LOC[j.locationId];if(l)add(l)}});
  return[...pts.values()];
}
function orsMissing(pts){let n=0;const c=D.ors||{};for(const a of pts)for(const b of pts){if(a===b)continue;if(!c[orsKey(a,b)])n++}return n}
let ORSBUSY=false;
async function fetchORS(dates,opts={}){
  const q=!!opts.quiet,say=m=>{if(!q)toast(m)};
  if(!SERVER){say('OpenRouteService werkt in de Netlify-versie, met ORS_API_KEY in Netlify.');return{got:0}}
  if(ORSBUSY)return{got:0};const pts=orsPointsFor(dates);if(pts.length<2){say('Er zijn nog geen locaties om rijtijden voor op te halen.');return{got:0}}
  D.ors=D.ors||{};const B=40,blocks=[];
  for(let i=0;i<pts.length;i+=B)for(let j=0;j<pts.length;j+=B){const I=pts.slice(i,i+B),J=pts.slice(j,j+B);if(I.some(a=>J.some(b=>a!==b&&!D.ors[orsKey(a,b)])))blocks.push([I,J])}
  if(!blocks.length){say('Alle rijtijden zijn al opgehaald.');return{got:0}}
  ORSBUSY=true;let done=0,got=0;
  try{
    for(const [I,J] of blocks){
      say(`Rijtijden ophalen bij OpenRouteService… ${done+1} van ${blocks.length}`);if(opts.onProgress)opts.onProgress(done+1,blocks.length);
      const locs=[],ix=p=>{let k=locs.indexOf(p);if(k<0){locs.push(p);k=locs.length-1}return k};
      const src=I.map(ix),dst=J.map(ix);
      const d=await api('/api/reistijden',{method:'POST',body:JSON.stringify({locations:locs.map(p=>[p.lng,p.lat]),sources:src,destinations:dst})});
      I.forEach((a,r)=>J.forEach((b,c)=>{if(a===b)return;const sec=d.durations&&d.durations[r]&&d.durations[r][c],km=d.distances&&d.distances[r]&&d.distances[r][c];if(sec!=null&&km!=null){D.ors[orsKey(a,b)]=[Math.round(km*10)/10,Math.round(sec/6)/10];got++}}));
      done++;if(done<blocks.length)await new Promise(r=>setTimeout(r,1600));
    }
    D.orsAt=Date.now();LEGS.clear();save();if(!q){render();toast(`${got} rijtijden opgehaald bij OpenRouteService. Klik op Automatisch plannen om de planning erop af te stemmen.`)}return{got};
  }catch(e){
    save();if(q)return{got,error:e};render();
    if(e.code==='pw'){askPw(()=>fetchORS(dates));return{got}}
    toast((done?`${done} van ${blocks.length} delen opgehaald. `:'')+(e.code==='nofn'?'De functie /api/reistijden is niet gevonden. Deploy de site via GitHub, inclusief netlify/functions/reistijden.mjs.':(e.message||'OpenRouteService gaf geen antwoord.'))+' Ontbrekende rijtijden worden geschat.');return{got,error:e};
  }finally{ORSBUSY=false}
}
/* ---------- PDOK: exacte posities van adressen (via /api/adres) ---------- */
const needsPdok=l=>!!l&&l.geo!=='manual'&&l.geo!=='pdok'&&(!!l.address||String(l.postcode||'').replace(/\s/g,'').length===6);
function pdokQuery(l){const pc=String(l.postcode||'').replace(/\s/g,'').toUpperCase();return l.address?{q:[l.address,pc,l.city].filter(Boolean).join(' '),type:'adres'}:{q:pc,type:'postcode'}}
async function pdokLocations(locs,onProgress){
  const todo=locs.filter(needsPdok),fail=[];let ok=0;
  for(let i=0;i<todo.length;i+=20){
    const part=todo.slice(i,i+20);if(onProgress)onProgress(i,todo.length);
    const d=await api('/api/adres',{method:'POST',body:JSON.stringify({items:part.map(l=>({id:l.id,...pdokQuery(l)}))})});
    for(const r of d.results||[]){
      const l=part.find(x=>x.id===r.id);if(!l)continue;
      const a=normTxt(l.city),b=normTxt(r.city),cityOk=!a||!b||a===b||a.includes(b)||b.includes(a);
      if(r.ok&&cityOk&&r.lat>50&&r.lat<54&&r.lng>3&&r.lng<8){l.lat=r.lat;l.lng=r.lng;l.geo='pdok';l.pdokLabel=r.label;delete l.pdokFail;if(!l.postcode&&r.postcode)l.postcode=r.postcode;ok++}
      else{l.pdokFail=r.ok?`PDOK vond "${r.label}", in een andere plaats`:(r.error||'Niet gevonden');fail.push(l)}
    }
  }
  if(onProgress)onProgress(todo.length,todo.length);
  LEGS.clear();return{ok,fail,total:todo.length};
}
function pdokAfterSave(loc){
  if(!SERVER||!needsPdok(loc))return;
  pdokLocations([loc]).then(r=>{save();render();toast(r.ok?`Exacte positie gevonden via PDOK: ${loc.pdokLabel}.`:'PDOK kon dit adres niet vinden; de geschatte positie blijft staan.')})
    .catch(e=>{if(e&&e.code==='pw')askPw(()=>pdokAfterSave(loc))});
}
async function pdokImprove(){
  if(!SERVER){toast('PDOK werkt in de Netlify-versie.');return}
  const locs=D.locations.filter(needsPdok);if(!locs.length){toast('Alle locaties hebben al een exacte positie.');return}
  try{const r=await pdokLocations(locs,(a,b)=>toast(`Posities opzoeken via PDOK… ${a} van ${b}`));save();render();
    toast(`${r.ok} van ${r.total} locaties hebben nu een exacte positie.${r.fail.length?` ${r.fail.length} niet gevonden; controleer het adres (zie kolom Positie).`:''}${useORS()&&r.ok?' Haal daarna de rijtijden opnieuw op.':''}`)}
  catch(e){save();render();if(e&&e.code==='pw'){askPw(pdokImprove);return}toast(apiErr(e))}
}
async function withPw(fn){
  try{return await fn()}catch(e){
    if(!(e&&e.code==='pw'))throw e;
    // Intussen al een (nieuw) wachtwoord ingevuld, bijv. in een ander verzoek of tabblad: gewoon opnieuw proberen
    if(getPw()&&getPw()!==e.used){try{return await fn()}catch(e2){if(!(e2&&e2.code==='pw'))throw e2;e=e2}}
    if(!getPw()&&await peerPw()){try{return await fn()}catch(e2){if(!(e2&&e2.code==='pw'))throw e2;e=e2}}
    if(e.used)pwForget(e.used);
    if(!await askPw())throw e;
    return await fn()}}
/* Na een Excel-import: exacte posities -> echte rijtijden -> planning, met voortgang */
async function importPipeline(ds,newLocs,msg){
  const steps=[['pdok','Exacte posities opzoeken via PDOK'],['ors','Echte rijtijden ophalen via OpenRouteService'],['plan','Planning maken']];
  const st={pdok:'wacht',ors:useORS()?'wacht':'uit',plan:'wacht'},info={};
  const lab={wacht:'Wacht…',bezig:'Bezig…',klaar:'Klaar',fout:'Niet gelukt',uit:'Overgeslagen'};
  const show=()=>{FORM=null;$('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="ipT" style="width:min(560px,100%)"><h3 id="ipT">Import verwerken</h3><p class="note">${esc(msg)}</p>
    <ol class="steps">${steps.map(([k,l])=>`<li class="st-${st[k]}"><b>${l}</b><span>${esc(info[k]||lab[st[k]])}</span></li>`).join('')}</ol>
    <p class="hint">Dit venster sluit vanzelf en toont daarna het importlog.</p></div>`;$('#modal').hidden=false};
  const run=async(k,fn)=>{st[k]='bezig';show();try{await withPw(fn);st[k]='klaar'}catch(e){st[k]='fout';info[k]=apiErr(e)+' De app rekent hier verder met de schatting.'}show()};
  await run('pdok',async()=>{
    const locs=[...new Set([...newLocs,...D.locations.filter(l=>D.jobs.some(j=>j.locationId===l.id&&ds.includes(j.date)))])].filter(needsPdok);
    if(!locs.length){info.pdok='Alle posities waren al exact';return}
    const r=await pdokLocations(locs,(a,b)=>{info.pdok=`${a} van ${b} adressen…`;show()});
    info.pdok=`${r.ok} van ${r.total} adressen exact gevonden${r.fail.length?`; ${r.fail.length} niet gevonden, daar blijft de geschatte positie`:''}`;save()});
  if(useORS())await run('ors',async()=>{const r=await fetchORS(ds,{quiet:true,onProgress:(a,b)=>{info.ors=`Deel ${a} van ${b}…`;show()}});if(r.error)throw r.error;info.ors=r.got?`${r.got} rijtijden opgehaald`:'Alle rijtijden waren al bekend'});
  else info.ors='Staat uit (Instellingen > Bron voor reistijden)';
  await run('plan',async()=>{replan(ds);info.plan=`${ds.length} dag(en) gepland`});
  await new Promise(r=>setTimeout(r,900));
  toast(msg+'.');openLog();
}

function orsChip(date,rows){
  if(!useORS())return'';const pts=orsPointsFor([date]);const miss=orsMissing(pts);
  return miss?`<button class="btn sm" data-act="orsfetch" data-date="${date}" title="Voor ${miss} trajecten is nog geen echte rijtijd bekend; daar wordt geschat">${I.route} ${miss} rijtijden ophalen</button>`:'<span class="chip ok" title="Rijtijden van OpenRouteService">Echte rijtijden</span>';
}

/* ---------- afwezigheid: soorten, registraties, verlofkalender en saldo ---------- */
const ABS_TYPES=[
  {id:'vakantie',name:'Vakantie',short:'V',leave:true},
  {id:'vrij',name:'Vrije dag',short:'VD',leave:true},
  {id:'ziek',name:'Ziek',short:'Z'},
  {id:'training',name:'Training / cursus',short:'T'},
  {id:'bijzonder',name:'Bijzonder verlof',short:'B'},
  {id:'arts',name:'Dokter / tandarts',short:'D'},
  {id:'overig',name:'Overig',short:'O'}];
const ABS=Object.fromEntries(ABS_TYPES.map(t=>[t.id,t]));
const absVar=t=>`var(--abs-${ABS[t]?t:'overig'})`;
function absDates(a){const out=[];for(let d=a.from,n=0;d<=a.to&&n<400;d=addDays(d,1),n++)out.push(d);return out}
function migrateAbsences(){
  D.absences=[];
  for(const w of D.workers){const ds=[...new Set(w.absent||[])].sort();let cur=null;
    for(const d of ds){const note=(w.absentNote||{})[d]||'',type=/ziek/i.test(note)?'ziek':'overig';
      if(cur&&addDays(cur.to,1)===d&&cur.type===type)cur.to=d;
      else{cur={id:uid('a'),wid:w.id,type,from:d,to:d,part:'',time:'',note:type==='overig'&&note&&note!=='Afwezig'?note:'',at:Date.now()};D.absences.push(cur)}}}
}
function syncAbsences(){
  const by={};for(const a of D.absences||[]){if(a.part)continue;(by[a.wid]=by[a.wid]||[]).push(a)}
  for(const w of D.workers){w.absent=[];w.absentNote={};
    for(const a of by[w.id]||[])for(const d of absDates(a)){if(!w.absent.includes(d))w.absent.push(d);w.absentNote[d]=(ABS[a.type]||ABS.overig).name}
    w.absent.sort()}
}
const partialAbs=(w,date)=>(D.absences||[]).find(a=>a.wid===w.id&&a.part&&a.from<=date&&a.to>=date);
function removeAbsenceDates(wid,from,to){const out=[];
  for(const a of D.absences||[]){if(a.wid!==wid||a.part||a.to<from||a.from>to){out.push(a);continue}
    if(a.from<from)out.push({...a,id:uid('a'),to:addDays(from,-1)});if(a.to>to)out.push({...a,id:uid('a'),from:addDays(to,1)})}
  D.absences=out;
}
function absWorkdays(a,w,year){let n=0;for(const d of absDates(a)){if(year&&d.slice(0,4)!==String(year))continue;if((w.days||[]).includes(wday(d)))n+=a.part?.5:1}return n}
function leaveBalance(w,year){const recs=(D.absences||[]).filter(a=>a.wid===w.id&&ABS[a.type]&&ABS[a.type].leave);
  const today=todayIso();let used=0,planned=0;
  for(const a of recs)for(const d of absDates(a)){if(d.slice(0,4)!==String(year)||!(w.days||[]).includes(wday(d)))continue;const v=a.part?.5:1;if(d<today)used+=v;else planned+=v}
  const total=+w.leaveDays||0;return{used,planned,total,left:total?total-used-planned:null}}
function absImpact(wid,from,to){const ids=[];for(let d=from;d<=to;d=addDays(d,1)){const P=D.plans[d];((P&&P.routes&&P.routes[wid])||[]).forEach(id=>{if(JOB[id])ids.push(id)})}return ids}
function absPeriod(a){const p=a.from===a.to?fdate(a.from,{weekday:'short',day:'numeric',month:'short'}):`${fdate(a.from,{day:'numeric',month:'short'})} t/m ${fdate(a.to,{day:'numeric',month:'short',year:a.from.slice(0,4)!==a.to.slice(0,4)?'numeric':undefined})}`;
  return p+(a.part?` · ${a.part==='laat'?'begint om '+a.time:'stopt om '+a.time}`:'')}
const absChip=a=>`<span class="abschip" style="--ac:${absVar(a.type)}">${esc(ABS[a.type]?ABS[a.type].name:'Afwezig')}</span>`;

function viewAbsence(){
  const ym=S.absMonth||S.date.slice(0,7),[y,m]=ym.split('-').map(Number),first=`${ym}-01`,n=new Date(y,m,0).getDate(),today=todayIso();
  const days=[];for(let i=0;i<n;i++)days.push(addDays(first,i));
  const wdL=['zo','ma','di','wo','do','vr','za'];
  const head=days.map(d=>{const wd=wday(d);return`<th class="cal-d${wd===0||wd===6?' we':''}${d===today?' today':''}" title="${esc(fdate(d,{weekday:'long',day:'numeric',month:'long'}))}"><span>${wdL[wd]}</span>${+d.slice(8)}</th>`}).join('');
  const rows=D.workers.map(w=>{
    const cells=days.map(d=>{const wd=wday(d),works=(w.days||[]).includes(wd),full=(D.absences||[]).find(a=>a.wid===w.id&&!a.part&&a.from<=d&&a.to>=d),pa=partialAbs(w,d),cls=`cal-c${wd===0||wd===6?' we':''}${d===today?' today':''}`;
      const tip=x=>`${w.name}: ${ABS[x.type]?ABS[x.type].name:''} ${absPeriod(x)}${x.note?' – '+x.note:''}`;
      if(full)return`<td class="${cls} has" style="--ac:${absVar(full.type)}" data-act="absedit" data-id="${full.id}" title="${esc(tip(full))}"><i>${esc(ABS[full.type]?ABS[full.type].short:'?')}</i></td>`;
      if(pa)return`<td class="${cls} half" style="--ac:${absVar(pa.type)}" data-act="absedit" data-id="${pa.id}" title="${esc(tip(pa))}"><i>${esc(ABS[pa.type]?ABS[pa.type].short:'?')}</i></td>`;
      if(!works&&!ovr(w,d))return`<td class="${cls} cal-off" title="${esc(w.name)} werkt niet op ${wdL[wd]}"></td>`;
      return`<td class="${cls}" data-act="absnew" data-wid="${w.id}" data-date="${d}" title="Afwezigheid registreren voor ${esc(w.name)} op ${esc(fdate(d,{weekday:'short',day:'numeric',month:'short'}))}"></td>`}).join('');
    return`<tr><td class="wk"><i class="dot" style="background:${wc(w)}"></i> ${esc(w.name)}</td>${cells}</tr>`}).join('');
  const legend=ABS_TYPES.map(t=>`<span><i class="lgabs" style="--ac:${absVar(t.id)}">${t.short}</i>${t.name}</span>`).join('')+'<span><i class="lgabs half" style="--ac:var(--muted)"></i>Deel van de dag</span>';
  const scope=S.absScope||'komend',fw=S.absW||'',ft=S.absT||'';
  const list=(D.absences||[]).filter(a=>WRK[a.wid]&&(!fw||a.wid===fw)&&(!ft||a.type===ft)&&(scope==='alle'||(scope==='komend'?a.to>=today:a.to<today)))
    .sort((a,b)=>scope==='verleden'?b.from.localeCompare(a.from):a.from.localeCompare(b.from));
  const lrows=list.map(a=>{const w=WRK[a.wid],imp=a.part?[]:absImpact(a.wid,a.from,a.to).filter(id=>JOB[id].date>=today);
    return`<tr><td><b style="display:flex;gap:7px;align-items:center"><i class="dot" style="background:${wc(w)}"></i>${esc(w.name)}</b></td><td>${absChip(a)}</td><td class="mono small">${esc(absPeriod(a))}</td><td class="mono">${absWorkdays(a,w)} ${absWorkdays(a,w)===1?'werkdag':'werkdagen'}</td><td class="small">${esc(a.note||'')}</td>
      <td>${imp.length?`<button class="btn sm" data-act="absredis" data-id="${a.id}" title="Deze afspraken staan nog bij ${esc(w.name)}">${I.auto} ${imp.length} afspraken herverdelen</button>`:'<span class="muted small">—</span>'}</td>
      <td class="act"><button class="btn ghost" data-act="absedit" data-id="${a.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`}).join('');
  const yr=+ym.slice(0,4);
  const bal=D.workers.map(w=>{const b=leaveBalance(w,yr);const pct=b.total?Math.min(100,Math.round((b.used+b.planned)/b.total*100)):0;
    return`<tr><td><b style="display:flex;gap:7px;align-items:center"><i class="dot" style="background:${wc(w)}"></i>${esc(w.name)}</b></td><td class="mono">${b.total||'<span class="muted">niet ingesteld</span>'}</td><td class="mono">${b.used}</td><td class="mono">${b.planned}</td><td class="mono">${b.left==null?'—':`<b style="color:var(--${b.left<0?'bad':'ink'})">${b.left}</b>`}</td><td style="min-width:120px">${b.total?`<div class="bar"><i style="width:${pct}%"></i></div>`:''}</td></tr>`}).join('');
  const sel=(id,act,opts,val)=>`<select class="mini" id="${id}" data-absf="${act}">${opts.map(([v,l])=>`<option value="${esc(v)}"${v===val?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  return`<section class="panel sec"><div class="toolbar"><h2>Verlofkalender</h2><div class="row"><button class="iconbtn" data-act="absmonth" data-d="-1" aria-label="Vorige maand"><svg class="ic" viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><b style="font:600 17px var(--f-disp);min-width:9em;text-align:center">${esc(fdate(first,{month:'long',year:'numeric'}))}</b><button class="iconbtn" data-act="absmonth" data-d="1" aria-label="Volgende maand"><svg class="ic" viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><span class="sp"></span><button class="btn primary" data-act="absnew">${I.plus} Afwezigheid registreren</button></div>
    <div class="cal-wrap"><table class="cal"><thead><tr><th class="wk">Medewerker</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="legend abslegend">${legend}</div><p class="hint" style="margin:0">Klik op een lege dag om afwezigheid te registreren, of op een gekleurde dag om die te wijzigen. Gestreepte dagen zijn vaste vrije dagen van de medewerker.</p></section>
  <section class="panel sec"><div class="toolbar"><h2>Registraties</h2><span class="sp"></span>${sel('absW','w',[['','Alle medewerkers'],...D.workers.map(w=>[w.id,w.name])],fw)}${sel('absT','t',[['','Alle soorten'],...ABS_TYPES.map(t=>[t.id,t.name])],ft)}<div class="seg">${[['komend','Komend'],['verleden','Verleden'],['alle','Alles']].map(([k,l])=>`<button data-act="absscope" data-k="${k}" aria-pressed="${scope===k}">${l}</button>`).join('')}</div></div>
    ${lrows?`<div class="tbl-wrap"><table><thead><tr><th>Medewerker</th><th>Soort</th><th>Periode</th><th>Duur</th><th>Opmerking</th><th>Afspraken</th><th></th></tr></thead><tbody>${lrows}</tbody></table></div>`:'<p class="empty">Geen registraties in deze selectie.</p>'}</section>
  <section class="panel sec"><div class="toolbar"><h2>Verlofsaldo ${yr}</h2><span class="sp"></span><span class="small muted">Vakantie en vrije dagen, in werkdagen. Stel het aantal verlofdagen per jaar in bij Medewerkers.</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Medewerker</th><th>Recht</th><th>Opgenomen</th><th>Gepland</th><th>Resterend</th><th></th></tr></thead><tbody>${bal}</tbody></table></div></section>`;
}
let ABSPEND=null;
function openAbs(id,preset={}){
  const a=id?(D.absences||[]).find(x=>x.id===id):null;if(id&&!a)return;
  const v=a?{...a}:{wid:preset.wid||(D.workers[0]||{}).id,type:preset.type||'vakantie',from:preset.date||S.date,to:preset.date||S.date,part:'',time:'',note:''};
  openForm({title:a?'Afwezigheid wijzigen':'Afwezigheid registreren',okLabel:'Opslaan',
    note:'Hele dagen maken de medewerker niet beschikbaar voor de planning. "Later beginnen" of "Eerder stoppen" past alleen de werktijd van die dag(en) aan.',
    fields:[{k:'wid',label:'Medewerker',type:'select',options:D.workers.map(w=>[w.id,w.name])},{k:'type',label:'Soort',type:'select',options:ABS_TYPES.map(t=>[t.id,t.name])},
      {k:'from',label:'Vanaf',type:'date',req:1},{k:'to',label:'Tot en met',type:'date',req:1},
      {k:'part',label:'Duur',type:'select',options:[['','Hele dag(en)'],['laat','Later beginnen (deel van de dag)'],['vroeg','Eerder stoppen (deel van de dag)']]},{k:'time',label:'Tijd (bij deel van de dag)',type:'time'},
      {k:'note',label:'Opmerking (niet bij ziekte: geen reden of diagnose vastleggen)',wide:1,ph:'bijv. vakantie Spanje, cursus coating'}],values:v,
    onSave:f=>{
      if(f.to<f.from)return'"Tot en met" moet op of na "Vanaf" liggen.';
      if((new Date(f.to)-new Date(f.from))/864e5>366)return'Kies een periode van maximaal een jaar.';
      if(f.part&&!f.time)return'Vul de tijd in waarop de medewerker begint of stopt.';
      if(!f.part)f.time='';
      if(f.type==='ziek')f.note='';
      const clash=(D.absences||[]).find(x=>x.id!==(a&&a.id)&&x.wid===f.wid&&!x.part&&!f.part&&x.from<=f.to&&x.to>=f.from);
      if(clash)return`Overlapt met ${ABS[clash.type].name} (${absPeriod(clash)}). Pas die registratie aan of kies een andere periode.`;
      const rec={...(a||{id:uid('a'),at:Date.now()}),...f};
      const imp=f.part?[]:absImpact(f.wid,f.from,f.to).filter(id=>JOB[id].date>=todayIso());
      if(imp.length){ABSPEND={rec,old:a};setTimeout(()=>absChoice(rec,imp.length),0);return''}
      absStore(rec,a);return'';
    },
    onDelete:a?()=>{absDelete(a)}:null,delNote:a?'De medewerker is daarna op deze dag(en) weer beschikbaar.':''});
}
function absStore(rec,old){
  D.absences=(D.absences||[]).filter(x=>x.id!==rec.id).concat(rec);syncAbsences();
  const ds=[];const lo=old&&old.from<rec.from?old.from:rec.from,hi=old&&old.to>rec.to?old.to:rec.to;for(let d=lo;d<=hi;d=addDays(d,1))ds.push(d);
  replan(ds.filter(d=>D.plans[d]||jobsOn(d).length));
  toast(`${ABS[rec.type].name} geregistreerd voor ${WRK[rec.wid].name}: ${absPeriod(rec)}.`);
}
function absChoice(rec,n){
  const w=WRK[rec.wid];FORM=null;
  $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="acT" style="width:min(560px,100%)"><h3 id="acT">${esc(ABS[rec.type].name)}: ${esc(w.name)}</h3>
    <p>${esc(absPeriod(rec))}. Op deze dag(en) staan nog <b>${n} ${n===1?'afspraak':'afspraken'}</b> bij ${esc(w.name.split(' ')[0])}.</p>
    <div class="dlg-foot" style="flex-wrap:wrap"><button class="btn" data-act="dlgx">Annuleren</button><span class="sp"></span><button class="btn" data-act="absgo" data-mode="only">Alleen registreren</button><button class="btn primary" data-act="absgo" data-mode="redis">${I.auto} Registreren en herverdelen</button></div>
    <p class="hint">Herverdelen zet de afspraken bij collega's, zonder hun planning om te gooien, en toont daarna een overzicht met een AI-plan voor wat niet past. Bij "Alleen registreren" blijven de afspraken voorlopig staan en zie je ze rood in de planning.</p></div>`;
  $('#modal').hidden=false;
}
function absDelete(a){
  const imp=!a.part&&(D.sickLog||[]).some(x=>x.wid===a.wid&&Object.keys(x.orig||{}).some(d=>d>=a.from&&d<=a.to));
  if(imp){setTimeout(()=>{openUnsick(a.wid);const f=$('#f_from'),t=$('#f_to');if(f)f.value=a.from;if(t)t.value=a.to},0);return}
  D.absences=(D.absences||[]).filter(x=>x.id!==a.id);syncAbsences();
  const ds=absDates(a).filter(d=>D.plans[d]||jobsOn(d).length);replan(ds);toast(`Registratie verwijderd; ${WRK[a.wid]?WRK[a.wid].name:'de medewerker'} is weer beschikbaar.`);
}

/* ---------- dagsimulatie ---------- */
/* Pauze: met een 'Pauze uiterlijk' moet de pauze er zijn. Lukt dat niet op een passend moment, dan wordt hij op het eerste moment na 'Pauze vanaf' geforceerd. */
function simulate(w,ids,date){
  const r=simulateBasis(w,ids,date,false);
  if(D.settings.pauseTot&&(+D.settings.pauseMin||0)>0&&r.stops.length&&!r.seg.some(x=>x.k==='pause'))return simulateBasis(w,ids,date,true);
  return r;
}
function simulateBasis(w,ids,date,force){
  const dt=date||(ids.length&&JOB[ids[0]]?JOB[ids[0]].date:null),sh=shiftOf(w,dt);
  const st=D.settings,start=t2m(sh.start)??480,end=t2m(sh.end)??1020,pAt=t2m(st.pauseAt)??720,pTot=t2m(st.pauseTot),pm=+st.pauseMin||0;
  let t=start,pos=wPt(w),km=0,trav=0,wait=0,serv=0,pauseDone=pm<=0,late=0,cur=null,depart=start,lastEnd=start;
  if(st.startAtFirst!==false&&ids.length){const j0=JOB[ids[0]],l0=j0&&LOC[j0.locationId];if(l0){const pf0=(D.plans[dt]&&D.plans[dt].prefs||{})[ids[0]];let a0=t2m(j0.from);if(pf0!=null&&(a0==null||pf0>a0))a0=pf0;const arr=Math.max(start,a0??start);depart=arr-leg(pos,lPt(l0)).min-(+st.parkMin||0);const mp=st.maxPreTravel==null||st.maxPreTravel===''?60:+st.maxPreTravel;depart=Math.max(depart,start-mp);t=depart}}
  const seg=[],stops=[],lateJobs=[],skillBad=[];
  const pause=()=>{seg.push({k:'pause',a:t,b:t+pm});t+=pm;pauseDone=true};
  /* Pauze is flexibel: alleen nemen als de volgende klussen daardoor niet buiten hun tijdvak vallen */
  const pauseFits=(i,t0,p0)=>{let tt=t0+pm,pp=p0;for(let k=i;k<Math.min(ids.length,i+5);k++){const jj=JOB[ids[k]],ll=jj&&LOC[jj.locationId];if(!ll)continue;const q=lPt(ll);if(q.key!==pp.key){tt+=leg(pp,q).min+(+st.parkMin||0);pp=q}const a=t2m(jj.from),b=t2m(jj.to);if(a!=null&&tt<=a)return true;tt+=jobDur(jj);if(b!=null&&tt>b+.5)return false}return true};
  for(let i=0;i<ids.length;i++){const id=ids[i];
    const j=JOB[id];if(!j)continue;const l=LOC[j.locationId];if(!l)continue;
    if(!skillOk(w,j))skillBad.push(id);
    const p=lPt(l);
    if(p.key!==pos.key){
      if(!pauseDone&&stops.length&&t>=pAt&&(force||pauseFits(i,t,pos)))pause();
      const g=leg(pos,p),mins=g.min+(+st.parkMin||0);
      seg.push({k:'drive',a:t,b:t+mins,km:g.km});t+=mins;km+=g.km;trav+=mins;pos=p;
      cur={loc:l,arrive:t,travel:mins,km:g.km,jobs:[],start:null,end:null,wait:0,late:false};stops.push(cur);
    }
    const pf=(D.plans[dt]&&D.plans[dt].prefs||{})[id];let ws=t2m(j.from);if(pf!=null&&(ws==null||pf>ws))ws=pf;const we=t2m(j.to);
    if(ws!=null&&t<ws){
      /* Wachten op een tijd: de pauze valt in die wachttijd (wordt getekend), mits die binnen het pauzevenster past */
      const pStart=Math.max(t,pAt);
      if(!pauseDone&&pm>0&&pStart+pm<=ws&&(pTot==null||pStart<=pTot)){
        if(pStart>t){seg.push({k:'wait',a:t,b:pStart});wait+=pStart-t;cur.wait+=pStart-t;t=pStart}
        pause();
      }
      seg.push({k:'wait',a:t,b:ws});wait+=ws-t;cur.wait+=ws-t;t=ws}
    else if(!pauseDone&&t>=pAt&&cur.jobs.length&&(force||pauseFits(i,t,pos)))pause();
    /* Alleen een tijd (zonder "tot"): exacte starttijd, te laat als de medewerker na die tijd start */
    const d=jobDur(j),s=t,e=t+d,exact=ws!=null&&we==null,lateStart=exact&&s>ws+.5,isLate=lateStart||(we!=null&&e>we+.5);
    seg.push({k:'job',a:s,b:e,id,late:isLate,ls:lateStart,vt:(pf!=null&&ws===pf)?pf:null});serv+=d;t=e;
    if(isLate){late+=lateStart?s-ws:e-we;lateJobs.push(id);cur.late=true}
    cur.jobs.push(id);if(cur.start==null)cur.start=s;cur.end=e;
  }
  if(stops.length){
    if(!pauseDone&&t-start>(+st.pauseMinDay||330)&&(pTot==null||t<=pTot))pause();
    lastEnd=t;
    const g=leg(pos,wPt(w));seg.push({k:'return',a:t,b:t+g.min,km:g.km});t+=g.min;km+=g.km;trav+=g.min;
  }
  const finish=stops.length?t:start;
  const endRef=st.endAtLast===true&&stops.length?lastEnd:finish;
  return{seg,stops,km,trav,wait,serv,start,end,depart,finish,over:Math.max(0,endRef-end),late,lateJobs,skillBad,n:ids.length};
}
const costOf=s=>s.stops.length?s.trav+D.settings.kmWeight*s.km:0;
const violOf=s=>s.late+s.over+s.skillBad.length*1000;
const feas=s=>violOf(s)<.5;
const penal=s=>costOf(s)+violOf(s)*8;

/* ---------- optimalisatie ---------- */
function bestPos(w,route,ids,strict){
  let best=null;
  for(let p=0;p<=route.length;p++){
    const arr=route.slice(0,p).concat(ids,route.slice(p));const s=simulate(w,arr);
    if(strict&&!feas(s))continue;const c=strict?costOf(s):penal(s);
    if(!best||c<best.c)best={c,p,arr,s};
  }
  return best;
}
function blocksOf(r){const b=[];for(const id of r){const l=JOB[id]?JOB[id].locationId:null;if(b.length&&b[b.length-1].loc===l)b[b.length-1].ids.push(id);else b.push({loc:l,ids:[id]})}return b}
function insertLoop(rest,R,ws){
  const base={};const upd=wid=>base[wid]=costOf(simulate(WRK[wid],R[wid]));ws.forEach(w=>upd(w.id));
  rest=[...rest];
  while(rest.length){
    let pick=null;
    for(const id of rest){
      const j=JOB[id],opts=[];
      for(const w of ws){if(!skillOk(w,j))continue;const b=bestPos(w,R[w.id],[id],true);if(b)opts.push({w:w.id,arr:b.arr,d:b.c-base[w.id]})}
      if(!opts.length)continue;
      opts.sort((a,b)=>a.d-b.d);
      const regret=opts.length>1?opts[1].d-opts[0].d:300;
      const score=(+j.priority||2)*1e6+Math.min(regret,999)*100-opts[0].d;
      if(!pick||score>pick.score)pick={id,score,o:opts[0]};
    }
    if(!pick)break;
    R[pick.o.w]=pick.o.arr;upd(pick.o.w);rest.splice(rest.indexOf(pick.id),1);
  }
}
function better(vN,cN,vO,cO){return vN<vO-.5||(vN<=vO+.01&&cN<cO-.5)}
function improve(R,ws,pins,within){
  const C={};const ev=wid=>{const s=simulate(WRK[wid],R[wid]);return{c:costOf(s),v:violOf(s)}};
  ws.forEach(w=>C[w.id]=ev(w.id));
  let it=0,changed=true;
  while(changed&&it<60){changed=false;it++;
    outer:for(const A of ws){
      const ra=R[A.id],blocks=blocksOf(ra);
      for(const blk of blocks){
        const rem=ra.filter(id=>!blk.ids.includes(id));const rs=simulate(A,rem),rc=costOf(rs),rv=violOf(rs);
        const pinned=blk.ids.some(id=>pins[id]===A.id);
        const targets=(within||pinned)?[A]:ws;
        for(const B of targets){
          if(B.id!==A.id&&blk.ids.some(id=>!skillOk(B,JOB[id])))continue;
          const rb=B.id===A.id?rem:R[B.id];
          for(let p=0;p<=rb.length;p++){
            const arr=rb.slice(0,p).concat(blk.ids,rb.slice(p));const s=simulate(B,arr),c=costOf(s),v=violOf(s);
            let ok;
            if(B.id===A.id)ok=better(v,c,C[A.id].v,C[A.id].c);
            else ok=better(rv+v,rc+c,C[A.id].v+C[B.id].v,C[A.id].c+C[B.id].c);
            if(ok){if(B.id===A.id)R[A.id]=arr;else{R[A.id]=rem;R[B.id]=arr;C[B.id]=ev(B.id)}C[A.id]=ev(A.id);changed=true;break outer}
          }
        }
      }
      if(!within)for(const B of ws){if(B.id<=A.id)continue;
        for(const a of blocksOf(R[A.id])){if(a.ids.some(id=>pins[id]===A.id||!skillOk(B,JOB[id])))continue;
          for(const b of blocksOf(R[B.id])){if(b.ids.some(id=>pins[id]===B.id||!skillOk(A,JOB[id])))continue;
            const nA=bestPos(A,R[A.id].filter(id=>!a.ids.includes(id)),b.ids,false),nB=bestPos(B,R[B.id].filter(id=>!b.ids.includes(id)),a.ids,false);
            const vN=violOf(nA.s)+violOf(nB.s),cN=costOf(nA.s)+costOf(nB.s);
            if(better(vN,cN,C[A.id].v+C[B.id].v,C[A.id].c+C[B.id].c)){R[A.id]=nA.arr;R[B.id]=nB.arr;C[A.id]=ev(A.id);C[B.id]=ev(B.id);changed=true;break outer}
          }
        }
      }
      const bl=blocksOf(R[A.id]);
      for(let i=0;i<bl.length-1;i++)for(let k=i+1;k<bl.length;k++){
        const nb=bl.slice(0,i).concat(bl.slice(i,k+1).reverse(),bl.slice(k+1));const arr=nb.flatMap(b=>b.ids);
        const s=simulate(A,arr);if(better(violOf(s),costOf(s),C[A.id].v,C[A.id].c)){R[A.id]=arr;C[A.id]=ev(A.id);changed=true;break outer}
      }
    }
  }
}
/* Meer voertuigen kwijt kunnen: haal een stop uit een rit, zet een ongeplande groep erin en plaats de stop elders terug */
function eject(R,ws,pins,jobs){
  for(let round=0;round<8;round++){
    const inR=new Set(Object.values(R).flat()),groups={};
    jobs.filter(j=>!inR.has(j.id)).sort((a,b)=>(+b.priority||2)-(+a.priority||2)).forEach(j=>(groups[j.locationId]=groups[j.locationId]||[]).push(j.id));
    const cand=Object.values(groups).flatMap(g=>g.length>1?[g,...g.map(x=>[x])]:[g]);
    let gain=false;
    tryAll:for(const G of cand){
      for(const A of ws){if(G.some(id=>!skillOk(A,JOB[id])))continue;const b=bestPos(A,R[A.id],G,true);if(b){R[A.id]=b.arr;gain=true;break tryAll}}
      for(const A of ws){if(G.some(id=>!skillOk(A,JOB[id])))continue;
        for(const blk of blocksOf(R[A.id])){if(blk.ids.some(id=>pins[id]===A.id))continue;
          const rem=R[A.id].filter(id=>!blk.ids.includes(id));const bA=bestPos(A,rem,G,true);if(!bA)continue;
          let placed=null;
          for(const B of ws){if(blk.ids.some(id=>!skillOk(B,JOB[id])))continue;const base=B.id===A.id?bA.arr:R[B.id];const bb=bestPos(B,base,blk.ids,true);if(bb&&(!placed||bb.c<placed.c))placed={w:B.id,arr:bb.arr,c:bb.c}}
          if(placed){R[A.id]=bA.arr;R[placed.w]=placed.arr;gain=true;break tryAll}
        }
      }
    }
    if(!gain)break;
  }
}
function getPlan(date){D.plans[date]=D.plans[date]||{routes:{},pinned:{}};const P=D.plans[date];P.routes=P.routes||{};P.pinned=P.pinned||{};return P}
const hasPlan=date=>!!(D.plans[date]&&(D.plans[date].auto||D.plans[date].edited||D.plans[date].archived));
function cleanPlan(date){
  const P=getPlan(date),ok=new Set(jobsOn(date).map(j=>j.id)),seen=new Set();
  for(const wid of Object.keys(P.routes)){if(!WRK[wid]){delete P.routes[wid];continue}P.routes[wid]=P.routes[wid].filter(id=>ok.has(id)&&!seen.has(id)&&seen.add(id))}
  for(const id of Object.keys(P.pinned))if(!ok.has(id)||!WRK[P.pinned[id]])delete P.pinned[id];
  return P;
}
function autoPlan(date){
  const P=cleanPlan(date),pins=P.pinned,skip=P.skip||{},jobs=jobsOn(date).filter(j=>!(skip[j.id]&&!pins[j.id]));
  /* Medewerkers met handmatige aanpassingen (vastgezette bezoeken of P.editW) houden hun route; alleen de overigen worden opnieuw ingepland */
  const manW=new Set([...Object.values(pins),...Object.keys(P.editW||{})]);
  const ws=D.workers.filter(w=>avail(w,date)&&!manW.has(w.id));
  const R={};D.workers.forEach(w=>{if(manW.has(w.id))R[w.id]=(P.routes[w.id]||[]).slice()});
  const bij=new Set(jobs.map(j=>j.id));ws.forEach(w=>R[w.id]=(P.routes[w.id]||[]).filter(id=>bij.has(id)&&!pins[id]));
  const inR=()=>new Set(Object.values(R).flat());
  insertLoop(jobs.map(j=>j.id).filter(id=>!inR().has(id)),R,ws);
  /* Optimaliseren alleen binnen de route van elke medewerker; bezoeken niet over medewerkers heen verplaatsen */
  improve(R,ws,pins,true);
  let left=jobs.map(j=>j.id).filter(id=>!inR().has(id));
  if(left.length){insertLoop(left,R,ws);improve(R,ws,pins,true)}
  P.routes=R;P.auto=Date.now();P.edited=manW.size?Date.now():0;
  return P;
}
function whyUnplanned(j,date){
  const ws=D.workers.filter(w=>avail(w,date));
  if(!ws.length)return'Geen medewerker beschikbaar op deze dag';
  const sk=jobSkill(j);const cap=ws.filter(w=>skillOk(w,j));
  if(!cap.length)return`Geen beschikbare medewerker met vaardigheid "${sk}"`;
  if(!cap.some(w=>feas(simulate(w,[j.id])))){
    let b=null;for(const w of cap){const s=simulate(w,[j.id]);if(!b||violOf(s)<b.v)b={w,s,v:violOf(s)}}
    const p=b.s.stops[0];
    if(p&&j.to&&b.s.late>.5)return`Niemand is op tijd: snelste is ${b.w.name.split(' ')[0]} (start ${b.w.start}, aankomst ${m2t(p.arrive)}, klaar ${m2t(p.end)}), maar venster eindigt om ${j.to}. Ruimer venster of medewerker dichterbij nodig`;
    if(b.s.over>.5)return`Past niet binnen werktijd: zelfs ${b.w.name.split(' ')[0]} is pas om ${m2t(b.s.finish)} terug (eindtijd ${b.w.end})`;
    return'Past niet binnen werktijd en tijdvenster, ook niet als enige opdracht';
  }
  return'Onvoldoende capaciteit binnen werktijden en tijdvensters';
}

/* ---------- handmatige aanpassingen ---------- */
function moveJobs(ids,wid,before){
  const P=getPlan(S.date);
  if(P.prefs)ids.forEach(id=>delete P.prefs[id]);
  for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>!ids.includes(id));
  if(!wid){ids.forEach(id=>delete P.pinned[id])}
  else{
    const r=P.routes[wid]=P.routes[wid]||[];
    if(before==='best'){const b=bestPos(WRK[wid],r,ids,true)||bestPos(WRK[wid],r,ids,false);P.routes[wid]=b.arr}
    else if(before){const i=r.indexOf(before);r.splice(i<0?r.length:i,0,...ids)}
    else r.push(...ids);
    ids.forEach(id=>P.pinned[id]=wid);
  }
  P.edited=Date.now();save();render();
  toast(wid?`Verplaatst naar ${WRK[wid].name} en vastgezet. Tijden en route zijn herberekend.`:'Uit de planning gehaald.');
  if(wid){
    const s=simulate(WRK[wid],P.routes[wid]||[]),late=s.lateJobs||[];
    if(late.length){
      const parts=late.slice(0,3).map(id=>{const j=JOB[id]||{},seg=s.seg.find(x=>x.k==='job'&&x.id===id),tm=seg?m2t(seg.a):'?';
        const win=(j.from||j.to)?` (tijdvak klant ${j.from||'?'}-${j.to||'?'})`:'';return `${j.plate||id} om ${tm}${win}`});
      toast(`Let op: ${WRK[wid].name} komt niet binnen het tijdvak bij ${parts.join('; ')}. De reistijd tussen de klussen is hierbij meegenomen; verplaats of kies een ander moment.`,9000);
    }
  }
}
function timeAt(z,e){const r=z.getBoundingClientRect(),rs=+z.dataset.rs,re=+z.dataset.re;const m=rs+(e.clientX-r.left)/r.width*(re-rs);return Math.max(rs,Math.round(m/5)*5)}
function lateWarn(wid){
  const P=getPlan(S.date);const s=simulate(WRK[wid],P.routes[wid]||[]),late=s.lateJobs||[];if(!late.length)return;
  const parts=late.slice(0,3).map(id=>{const j=JOB[id]||{},seg=s.seg.find(x=>x.k==='job'&&x.id===id),tm=seg?m2t(seg.a):'?';const win=(j.from||j.to)?` (tijdvak klant ${j.from||'?'}-${j.to||'?'})`:'';return `${j.plate||id} om ${tm}${win}`});
  toast(`Let op: ${WRK[wid].name} komt niet binnen het tijdvak bij ${parts.join('; ')}. De reistijd tussen de klussen is hierbij meegenomen; verplaats of kies een ander moment.`,9000);
}
function moveJobsAt(ids,wid,minutes){
  const P=getPlan(S.date);
  for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>!ids.includes(id));
  const r=P.routes[wid]=P.routes[wid]||[];
  const st=simulate(WRK[wid],r);
  let idx=r.length;for(let i=0;i<r.length;i++){const g=st.seg.find(x=>x.k==='job'&&x.id===r[i]);if(g&&g.a>minutes){idx=i;break}}
  r.splice(idx,0,...ids);
  P.prefs=P.prefs||{};ids.forEach((id,k)=>{if(k===0)P.prefs[id]=minutes;else delete P.prefs[id];P.pinned[id]=wid});
  P.edited=Date.now();save();render();
  toast(`Gezet op ${m2t(minutes)} bij ${WRK[wid].name}. Tijden en route zijn herberekend.`);
  lateWarn(wid);
}
function bestWorkerFor(ids){
  const date=S.date,P=getPlan(date),ws=D.workers.filter(w=>avail(w,date));let best=null;
  for(const w of ws){const r=P.routes[w.id]||[],b0=simulate(w,r);const b=bestPos(w,r,ids,true);if(b){const d=b.c-costOf(b0);if(!best||d<best.d)best={w:w.id,d}}}
  return best&&best.w;
}

