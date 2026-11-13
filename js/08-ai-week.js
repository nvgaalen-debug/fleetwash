/* AI-voorstel voor een dag of een week. De AI krijgt codes en reistijden (geen namen of adressen).
   Het voorstel wordt daarna door de planner doorgerekend; alleen een voorstel dat werkt, wordt voorgelegd. */
let AIV_BUSY=false;
const aiCode=(p,i)=>p+String(i+1).padStart(2,'0');
function aiHuidigeWerker(j,P){if(P.pinned[j.id]&&WRK[P.pinned[j.id]])return P.pinned[j.id];for(const k of Object.keys(P.routes))if(P.routes[k].includes(j.id))return k;return null}
/* Vast = bij een medewerker vastgezet, of een vaste tijd (alleen "van", of een slot met begin en eind) */
const aiVast=(j,P)=>!!(P.pinned[j.id]||(j.from&&(!j.to||+j.duration>0)));
function aiStart(j,P){const pf=(P.prefs||{})[j.id];let s=t2m(j.from);if(pf!=null&&(s==null||pf>s))s=pf;return s}

async function aiVoorstel(dates){
  if(AIV_BUSY)return;
  if(aiMode()!=='server'){toast('Het AI-voorstel werkt alleen op de server.');return}
  dates=[...new Set(dates)].filter(d=>jobsOn(d).length).sort();
  if(!dates.length){toast('Geen bezoeken op deze dag(en).');return}
  AIV_BUSY=true;
  try{
    const wC={},wByC={};D.workers.forEach((w,i)=>{wC[w.id]=aiCode('W',i);wByC[wC[w.id]]=w});
    const lC={},lIds=[],jobs=[];
    dates.forEach(d=>jobsOn(d).forEach(j=>{jobs.push(j);if(!(j.locationId in lC)){lC[j.locationId]=aiCode('L',lIds.length);lIds.push(j.locationId)}}));
    const jC={},jByC={};jobs.forEach((j,i)=>{jC[j.id]=aiCode('J',i);jByC[jC[j.id]]=j});

    const lines=['Werkers per dag (code, datum, werktijd, vaardigheden):'];
    D.workers.forEach(w=>dates.forEach(d=>{const sh=avail(w,d)?shiftOf(w,d):null;lines.push(`${wC[w.id]} ${d} ${sh?sh.start+'-'+sh.end:'niet beschikbaar'} vaardigheden=${(w.skills||[]).join('|')||'geen'}`)}));
    lines.push('Reistijden in minuten (van>naar):');
    lIds.forEach((a,i)=>lIds.forEach((b,k)=>{if(i!==k)lines.push(`${lC[a]}>${lC[b]} ${Math.round(leg(lPt(LOC[a]),lPt(LOC[b])).min)}`)}));
    D.workers.forEach(w=>lIds.forEach(id=>{const m1=Math.round(leg(wPt(w),lPt(LOC[id])).min),m2=Math.round(leg(lPt(LOC[id]),wPt(w)).min);lines.push(`${wC[w.id]}>${lC[id]} ${m1}`);lines.push(`${lC[id]}>${wC[w.id]} ${m2}`)}));
    lines.push('Bezoeken (vast=ja: blijft staan zoals het is; vast=nee: plan in):');
    jobs.forEach(j=>{const P=getPlan(j.date),cur=aiHuidigeWerker(j,P),v=aiVast(j,P)&&cur!=null;const s=aiStart(j,P);
      lines.push(`${jC[j.id]} dag=${j.date} loc=${lC[j.locationId]} duur=${jobDur(j)} van=${j.from||'-'} tot=${j.to||'-'} vaardigheid=${jobSkill(j)||'geen'} vast=${v?'ja':'nee'}${v?' werker='+wC[cur]+' start='+(s!=null?m2t(s):'-'):''}`)});
    const prompt=`Je bent planner voor reinigingsbezoeken aan auto's. Geef ALLEEN JSON terug, zonder tekst eromheen, in dit formaat:
{"plan":[{"job":"J01","werker":"W02","start":"08:30","reden":"korte zin, max 10 woorden, Nederlands"}]}
Regels:
- Neem alleen bezoeken met vast=nee op in het antwoord. Bezoeken met vast=ja blijven staan zoals ze zijn.
- Elk bezoek met vast=nee krijgt precies één werker en één starttijd. De starttijd ligt binnen de werktijd van die werker op die dag, en binnen van/tot als die zijn ingevuld.
- Een werker doet op één moment één bezoek. Tussen twee bezoeken moet genoeg tijd zitten voor reistijd en duur. Reistijd van de standplaats (Wxx) naar een locatie staat als Wxx>Lxx; tussen locaties als Lxx>Lxx.
- Een werker krijgt alleen een bezoek als hij de vaardigheid heeft (geen = iedereen).
- Verdeel het werk zo dat de totale reistijd klein blijft.
- Geef bij elk bezoek een korte reden (max 10 woorden), bijvoorbeeld: kortere rit vanaf standplaats, medewerker zit toch in de buurt, past in lege tijd.
- Antwoord alleen met de JSON.

${lines.join('\n')}`;
    if(prompt.length>19000){toast('Te veel bezoeken voor één verzoek. Kies één dag.');return}

    toast('AI maakt een voorstel…',30000);
    let txt='';
    try{txt=await serverAI(prompt)}
    catch(e){toast(e&&e.code==='pw'?'Wachtwoord nodig voor de AI.':(e&&e.message)||'AI-voorstel mislukt.');return}

    const a=txt.indexOf('{'),b=txt.lastIndexOf('}');let obj=null;
    try{obj=JSON.parse(txt.slice(a,b+1))}catch(e){}
    if(!obj||!Array.isArray(obj.plan)){toast('De AI gaf geen bruikbaar voorstel. Probeer het opnieuw.');return}
    const lByC={};lIds.forEach(id=>lByC[lC[id]]=id);
    /* Codes in de reden van de AI vervangen door namen */
    const aiVertaal=t=>t.replace(/\bW\d{2}\b/g,c=>wByC[c]?wByC[c].name:c).replace(/\bL\d{2}\b/g,c=>lByC[c]?aiKlantLoc({locationId:lByC[c]}):c).replace(/\bJ\d{2,}\b/g,c=>jByC[c]?jByC[c].plate:c);
    const koz={};
    for(const p of obj.plan){const j=jByC[p.job],w=wByC[p.werker];if(!j||!w||!/^\d{1,2}:\d{2}$/.test(p.start||''))continue;if(!(j.id in koz))koz[j.id]={wid:w.id,start:t2m(p.start),reden:aiVertaal(String(p.reden||'')).slice(0,160)}}

    const nieuw={},fout=[];let verplaatst=0;
    for(const d of dates){
      const P=getPlan(d),per={},starts={},vaste=new Set(),flex=new Set();
      D.workers.forEach(w=>per[w.id]=[]);
      for(const j of jobsOn(d)){
        const cur=aiHuidigeWerker(j,P);
        if(aiVast(j,P)&&cur){per[cur].push(j.id);starts[j.id]=aiStart(j,P);vaste.add(j.id);continue}
        const k=koz[j.id];
        if(!k){fout.push(`${j.plate} (${d}): niet ingepland door de AI`);continue}
        const w=WRK[k.wid];
        if(!skillOk(w,j)){fout.push(`${j.plate}: ${w.name} heeft de vaardigheid niet`);continue}
        if(!avail(w,d)){fout.push(`${j.plate}: ${w.name} is die dag niet beschikbaar`);continue}
        per[k.wid].push(j.id);starts[j.id]=k.start;flex.add(j.id);
        if(cur&&cur!==k.wid)verplaatst++;
      }
      for(const wid of Object.keys(per)){
        per[wid].sort((x,y)=>(starts[x]??0)-(starts[y]??0));
        if(!per[wid].length)continue;
        const s=simulate(WRK[wid],per[wid],d);
        const teLaat=s.lateJobs.filter(id=>flex.has(id)).length;
        const heeftFlex=per[wid].some(id=>flex.has(id));
        if(teLaat||(heeftFlex&&s.over>0))fout.push(`${WRK[wid].name} op ${d}: ${teLaat||'een'} bezoek(en) buiten het tijdvak of de werktijd`);
      }
      nieuw[d]=per;
    }
    if(fout.length){toast(`AI-voorstel past niet binnen de regels: ${fout.slice(0,2).join('; ')}. Kies een andere dag of pas het zelf aan.`,9000);return}

    /* Alleen een voorstel dat de totale reistijd verlaagt, wordt getoond */
    const tr=(R,d)=>D.workers.reduce((a,w)=>{const ids=(R&&R[w.id])||[];return ids.length?a+simulate(WRK[w.id],ids,d).trav:a},0);
    let voor=0,na=0;
    for(const d of dates){voor+=tr(getPlan(d).routes,d);na+=tr(nieuw[d],d)}
    if(na>=voor-1){toast(`Het AI-voorstel verbetert de reistijd niet (${Math.round(voor)} min nu, ${Math.round(na)} min voorstel). Er is niets veranderd.`,9000);return}
    /* Overzicht van wat er verandert, vóórdat er iets wordt opgeslagen */
    const rijen=[];let vastN=0;
    for(const d of dates){
      const P0=getPlan(d),nu={};
      jobsOn(d).forEach(j=>{const wj=jobWhere(j.id);nu[j.id]=wj&&wj.wid?{naam:WRK[wj.wid].name,t:wj.start}:null});
      for(const wid of Object.keys(nieuw[d])){
        const ids=nieuw[d][wid];if(!ids.length)continue;
        const s=simulate(WRK[wid],ids,d);
        for(const id of ids){
          const j=JOB[id];
          if(aiVast(j,P0)&&aiHuidigeWerker(j,P0)){vastN++;continue}
          const seg=s.seg.find(x=>x.k==='job'&&x.id===id),nt=seg?seg.a:null,v=nu[id];
          if(!v||v.naam!==WRK[wid].name||v.t!==nt)rijen.push({plate:j.plate,loc:aiKlantLoc(j),nu:v?`${v.naam}${v.t!=null?' om '+m2t(v.t):''}`:'niet ingepland',nieuw:`${WRK[wid].name}${nt!=null?' om '+m2t(nt):''}`,reden:(koz[id]&&koz[id].reden)||'Betere volgorde binnen de rit'});
        }
      }
    }
    if(!rijen.length){toast('Het AI-voorstel verandert niets.');return}
    const samen=`${dates.length===1?'Deze dag':dates.length+' dagen'}: ${rijen.length} bezoek(en) veranderen van medewerker of tijd. Totale reistijd ${Math.round(voor)} min nu, ${Math.round(na)} min na het voorstel. ${vastN} vaste bezoek(en) blijven staan.`;
    const ok=await aiOverzicht(rijen,samen);
    if(!ok)return;
    dates.forEach(d=>{const P=getPlan(d);P.routes=nieuw[d];P.auto=Date.now();P.edited=0});
    save();render();
    toast(`AI-voorstel doorgevoerd voor ${dates.length} dag(en).`);
  }finally{AIV_BUSY=false}
}

/* Overzichtsvenster: tabel met wat er per bezoek verandert. Geeft true bij Doorvoeren, false bij Annuleren. */
function aiOverzicht(rijen,samen){
  return new Promise(res=>{
    const m=$('#modal');
    m.innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="aivT" style="max-width:860px"><h3 id="aivT">AI-voorstel: wat verandert er</h3><p class="note">${esc(samen)} Vaste tijdsloten en vastgezette bezoeken worden niet gewijzigd.</p><div class="tbl-wrap" style="max-height:55vh;overflow:auto"><table><thead><tr><th>Kenteken</th><th>Klant en locatie</th><th>Nu</th><th>Voorstel</th><th>Reden</th></tr></thead><tbody>${rijen.map(r=>`<tr><td class="mono">${esc(r.plate)}</td><td>${esc(r.loc)}</td><td>${esc(r.nu)}</td><td><b>${esc(r.nieuw)}</b></td><td>${esc(r.reden)}</td></tr>`).join('')}</tbody></table></div><div class="dlg-foot"><span class="sp"></span><button type="button" class="btn" id="aivNee">Annuleren</button><button type="button" class="btn primary" id="aivJa">Doorvoeren</button></div></div>`;
    m.hidden=false;
    const klaar=v=>{m.hidden=true;m.innerHTML='';res(v)};
    $('#aivNee').onclick=()=>klaar(false);
    $('#aivJa').onclick=()=>klaar(true);
  });
}

/* Klantnaam en locatienaam voor in het overzicht */
function aiKlantLoc(j){const l=LOC[j.locationId];if(!l)return'';const c=D.customers.find(x=>x.id===l.customerId);return[c?c.name:'',l.name].filter(Boolean).join(' · ')}

/* Planning per klant mailen: datum, tijden en kentekens. De mail wordt klaargezet in het mailprogramma; de gebruiker verstuurt zelf. */
function mailKlantKies(date){
  const per={};
  jobsOn(date).forEach(j=>{const l=LOC[j.locationId];if(!l)return;(per[l.customerId]=per[l.customerId]||[]).push(j)});
  const cids=Object.keys(per);
  if(!cids.length){toast('Geen bezoeken op deze dag.');return}
  const rijen=cids.map(cid=>{const c=D.customers.find(x=>x.id===cid);return{cid,naam:c?c.name:'Onbekende klant',mail:(c&&c.email)||''}});
  const m=$('#modal');
  m.innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="mkT" style="max-width:680px"><h3 id="mkT">Planning mailen naar klant</h3><p class="note">${esc(fdate(date,{weekday:'long',day:'numeric',month:'long'}))}. De mail wordt klaargezet in je mailprogramma; jij controleert en verstuurt hem.</p><div class="tbl-wrap" style="max-height:55vh;overflow:auto"><table><thead><tr><th>Klant</th><th>E-mail</th><th>Bezoeken</th><th></th></tr></thead><tbody>${rijen.map((r,i)=>`<tr><td>${esc(r.naam)}</td><td>${r.mail?esc(r.mail):'<span class="muted">geen e-mailadres</span>'}</td><td>${per[r.cid].length}</td><td>${r.mail?`<button class="btn sm" data-mk="${i}">Mail klaarzetten</button>`:''}</td></tr>`).join('')}</tbody></table></div><div class="dlg-foot"><span class="sp"></span><button type="button" class="btn" id="mkSluit">Sluiten</button></div></div>`;
  m.hidden=false;
  $('#mkSluit').onclick=()=>{m.hidden=true;m.innerHTML=''};
  m.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{
    const r=rijen[+b.dataset.mk];
    const regels=per[r.cid].map(j=>{const wj=jobWhere(j.id);return{t:wj&&wj.start!=null?m2t(wj.start):'',plate:j.plate}}).sort((a,b)=>a.t.localeCompare(b.t)).map(x=>`${x.t||'tijd nog te bevestigen'}  ${x.plate}`);
    const onderwerp=`Planning reiniging ${fdate(date,{weekday:'long',day:'numeric',month:'long'})}`;
    const tekst=`Beste ${r.naam},\n\nHierbij de planning voor ${fdate(date,{weekday:'long',day:'numeric',month:'long'})}:\n\n${regels.join('\n')}\n\nMet vriendelijke groet`;
    m.hidden=true;m.innerHTML='';
    window.location.href=`mailto:${encodeURIComponent(r.mail)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`;
  });
}
