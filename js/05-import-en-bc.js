/* ---------- zoekbare keuzelijst (combobox) voor formulieren ---------- */
const COMBO={};
const normTxt=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
function comboHtml(f,v){
  COMBO[f.k]=f.options;const cur=f.options.find(o=>String(o.v)===String(v??''));
  return`<div class="fld wide combo"><span>${esc(f.label)}</span><input type="search" id="f_${f.k}_q" data-combo="${f.k}" value="${esc(cur?cur.label:'')}" placeholder="${esc(f.ph||'Typ om te zoeken')}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="f_${f.k}_list"><input type="hidden" id="f_${f.k}" value="${esc(cur?cur.v:'')}"><div class="combo-list" id="f_${f.k}_list" role="listbox" hidden></div></div>`;
}
function comboShow(k,q){
  const list=$('#f_'+k+'_list');if(!list)return;const opts=COMBO[k]||[];const words=normTxt(q).split(' ').filter(Boolean);
  const hits=opts.filter(o=>words.every(w=>o.hay.includes(w))).slice(0,40);
  list.innerHTML=hits.length?hits.map((o,i)=>`<button type="button" role="option" data-act="combopick" data-k="${k}" data-v="${esc(o.v)}"${i===0?' class="first"':''}><b>${esc(o.title)}</b><small>${esc(o.sub)}</small></button>`).join('')+(opts.length>hits.length&&hits.length===40?'<p class="small muted" style="margin:6px 10px">Typ verder om meer te filteren…</p>':'')
    :'<p class="small muted" style="margin:8px 10px">Geen klant of locatie gevonden. Maak een nieuwe klant aan via Klanten &amp; locaties.</p>';
  list.hidden=false;const inp=$('#f_'+k+'_q');if(inp)inp.setAttribute('aria-expanded','true');
}
function comboHide(k){const l=$('#f_'+k+'_list');if(l)l.hidden=true;const inp=$('#f_'+k+'_q');if(inp)inp.setAttribute('aria-expanded','false')}
function comboPick(k,v){const o=(COMBO[k]||[]).find(x=>String(x.v)===String(v));if(!o)return;$('#f_'+k).value=o.v;$('#f_'+k+'_q').value=o.label;comboHide(k)}
if(typeof document!=='undefined'){
document.addEventListener('focusin',e=>{const k=e.target.dataset&&e.target.dataset.combo;if(k){e.target.select();comboShow(k,'')}});
document.addEventListener('mousedown',e=>{if(!e.target.closest('.combo'))Object.keys(COMBO).forEach(comboHide)});
document.addEventListener('keydown',e=>{const k=e.target.dataset&&e.target.dataset.combo;if(!k)return;
  if(e.key==='Escape'){const l=$('#f_'+k+'_list');if(l&&!l.hidden){e.stopPropagation();e.preventDefault();comboHide(k)}}
  else if(e.key==='Enter'){const b=$('#f_'+k+'_list button');if(b&&!$('#f_'+k+'_list').hidden){e.preventDefault();comboPick(k,b.dataset.v)}}
  else if(e.key==='ArrowDown'){const b=$('#f_'+k+'_list button');if(b){e.preventDefault();b.focus()}}},true);
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.combo-list button');if(!b)return;
  if(e.key==='ArrowDown'&&b.nextElementSibling&&b.nextElementSibling.tagName==='BUTTON'){e.preventDefault();b.nextElementSibling.focus()}
  if(e.key==='ArrowUp'){e.preventDefault();const p=b.previousElementSibling;if(p)p.focus();else $('#f_'+b.dataset.k+'_q').focus()}});
}

/* ---------- formulier-dialoog ---------- */
let FORM=null;
function fieldHtml(f,v){
  const id='f_'+f.k,w=f.wide?' wide':'';
  if(f.type==='select')return`<label class="fld${w}"><span>${esc(f.label)}</span><select id="${id}">${f.options.map(([a,b])=>`<option value="${esc(a)}"${String(v??'')===String(a)?' selected':''}>${esc(b)}</option>`).join('')}</select></label>`;
  if(f.type==='checks')return`<fieldset class="fld wide"><legend>${esc(f.label)}</legend><div class="checks">${f.options.length?f.options.map(([a,b])=>`<label class="chk"><input type="checkbox" name="${id}" value="${esc(a)}"${(v||[]).map(String).includes(String(a))?' checked':''}>${esc(b)}</label>`).join(''):'<span class="muted small">Geen opties. Voeg vaardigheden toe via reinigingstypes.</span>'}</div></fieldset>`;
  if(f.type==='combo')return comboHtml(f,v);
  if(f.type==='heading')return`<div class="fld wide fsec">${esc(f.label)}</div>`;
  if(f.type==='textarea')return`<label class="fld wide"><span>${esc(f.label)}</span><textarea id="${id}"${f.plain?' class="plain"':''} placeholder="${esc(f.ph||'')}">${esc(v??'')}</textarea></label>`;
  return`<label class="fld${w}"><span>${esc(f.label)}</span><input id="${id}" type="${f.type||'text'}" value="${esc(v??'')}"${f.ph?` placeholder="${esc(f.ph)}"`:''}${f.req?' required':''}${f.step?` step="${f.step}"`:''}></label>`;
}
function openForm(o){
  FORM=o;MV=null;const m=$('#modal');
  m.innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT"><form id="dlgF" novalidate><h3 id="dlgT">${esc(o.title)}</h3>${o.note?`<p class="note">${esc(o.note)}</p>`:''}<div class="fgrid">${o.fields.map(f=>fieldHtml(f,o.values[f.k])).join('')}</div><p class="hint" id="dlgErr" style="color:var(--bad)" hidden></p><div class="dlg-foot">${o.onDelete?'<button type="button" class="btn danger" data-act="dlgdel">Verwijderen</button>':''}<span class="sp"></span><button type="button" class="btn" data-act="dlgx">Annuleren</button><button type="submit" class="btn primary">${esc(o.okLabel||'Opslaan')}</button></div></form></div>`;
  m.hidden=false;const first=m.querySelector('input,select,textarea');if(first)first.focus();
  $('#dlgF').addEventListener('submit',e=>{e.preventDefault();
    for(const f of o.fields){if(f.req){const el=$('#f_'+f.k);if(el&&!String(el.value).trim()){return showErr(f.type==='combo'?`Kies een ${f.label.toLowerCase()} uit de lijst.`:`Vul "${f.label}" in.`)}}}
    const v={};for(const f of o.fields){if(f.type==='heading')continue;if(f.type==='checks')v[f.k]=[...document.querySelectorAll(`[name="f_${f.k}"]:checked`)].map(i=>f.num?+i.value:i.value);else{const el=$('#f_'+f.k);v[f.k]=f.type==='number'?(el.value===''?'':+el.value):el.value.trim()}}
    if(v.priority!=null&&v.priority!=='')v.priority=+v.priority;
    const err=o.onSave(v);if(err)return showErr(err);closeForm();});
}
function showErr(t){const e=$('#dlgErr');e.textContent=t;e.hidden=false}
function closeForm(){$('#modal').hidden=true;$('#modal').innerHTML='';FORM=null;MV=null}

/* ---------- import / export ---------- */
function openImport(){
  openForm({title:'Opdrachten importeren',okLabel:'Importeren',note:'Plak regels uit Excel of een CSV. Kolommen: kenteken; voertuig; klant; adres; postcode; plaats; datum; vanaf; tot; type; duur; prioriteit. Onbekende klanten en locaties worden aangemaakt.',
    fields:[{k:'csv',label:'Gegevens',type:'textarea',ph:'kenteken;voertuig;klant;adres;postcode;plaats;datum;vanaf;tot;type;duur;prioriteit\nGZ-381-K;VW Golf;Autobedrijf Van Dijk;Industrieweg 12;5301 LK;Zaltbommel;2026-10-29;08:00;12:00;compleet;;2'}],values:{},
    onSave:v=>{const r=importCsv(v.csv);if(typeof r==='string')return r;replan(r.dates);toast(`${r.n} opdracht(en) geïmporteerd${r.newLoc?`, ${r.newLoc} nieuwe locatie(s)`:''}.`)}});
}
function importCsv(txt){
  const lines=String(txt||'').split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return'Plak minimaal één regel.';
  const sep=lines[0].includes('\t')?'\t':lines[0].includes(';')?';':',';
  let n=0,newLoc=0;const dates=[],errs=[];
  lines.forEach((ln,i)=>{const c=ln.split(sep).map(x=>x.trim().replace(/^"|"$/g,''));if(i===0&&/kenteken/i.test(c[0]))return;
    const[plate,veh,cust,addr,pc,city,dRaw,from,to,typ,durS,prio]=c;
    let date=dRaw||'';const m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(date);if(m)date=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if(!plate||!cust||!pc||!/^\d{4}-\d{2}-\d{2}$/.test(date)){errs.push(i+1);return}
    let cu=D.customers.find(x=>x.name.toLowerCase()===cust.toLowerCase());if(!cu){cu={id:uid('c'),name:cust,contact:'',phone:'',email:''};D.customers.push(cu)}
    const npc=pc.replace(/\s/g,'').toUpperCase();
    let lo=D.locations.find(l=>l.customerId===cu.id&&l.postcode.replace(/\s/g,'').toUpperCase()===npc);
    if(!lo){const g=geocode(pc);if(!g){errs.push(i+1);return}lo={id:uid('l'),customerId:cu.id,name:addr||'Locatie',address:addr||'',postcode:pc,city:city||'',...g};D.locations.push(lo);newLoc++}
    const tt=D.types.find(t=>t.id===(typ||'').toLowerCase()||t.name.toLowerCase().startsWith((typ||'').toLowerCase()))||D.types[0];
    D.jobs.push({id:uid('j'),plate:plate.toUpperCase(),vehicle:veh||'',locationId:lo.id,date,from:from||'',to:to||'',type:tt.id,duration:+durS||'',priority:+prio||2,notes:''});n++;dates.push(date)});
  if(!n)return`Geen regels geïmporteerd. Controleer regel(s) ${errs.slice(0,8).join(', ')}: kenteken, klant, postcode en datum zijn verplicht.`;
  index();return{n,newLoc,dates};
}
/* ---------- Excel-import: één rij per voertuig, herhalende kolommen Datum / Tijd / Opmerking ---------- */
const clean=s=>String(s??'').replace(/ /g,' ').replace(/\s+/g,' ').trim();
function xDate(v){
  if(v==null||v==='')return null;
  if(typeof v==='number'&&v>20000&&v<80000)return new Date(Math.round((Math.floor(v)-25569)*864e5)).toISOString().slice(0,10);
  if(v instanceof Date&&!isNaN(v))return`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  const s=clean(v);let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);if(m)return`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(s);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
  return null;
}
function xTime(v){
  if(v==null||v==='')return{};
  if(typeof v==='number'&&v<1)return{from:m2t(Math.round(v*1440))};
  const ts=[...clean(v).matchAll(/(\d{1,2})[:.](\d{2})/g)].map(m=>m2t(+m[1]*60+ +m[2]));
  return{from:ts[0]||'',to:ts[1]||''};
}
/* Titelregels boven de kolomnamen: klantnaam, inlog, telefoon en losse aanwijzingen */
function sheetMeta(top){
  const cells=top.flat().map(clean).filter(Boolean),m={cust:'',login:'',phone:'',info:[]};
  for(const c of cells){
    if(!m.cust&&/(overzicht|planning|lijst|rooster|schema)/i.test(c)){let t=c.replace(/[:\s]+$/,'').replace(/^.*?(auto['\u2019]?s|voertuigen|wagens|leasewagens|bedrijfswagens)\s+(van|voor)?\s*/i,'').replace(/^(overzicht|planning|wasplanning|lijst|rooster|schema)\s+(van|voor)?\s*/i,'');if(t&&t.length<=40)m.cust=t;continue}
    if(/inlog|login/i.test(c)){m.login=c.replace(/^\s*(inlog|login)\s*:?\s*/i,'');continue}
    if(/^(\+31|0)[\d\s-]{8,}$/.test(c)){m.phone=c;continue}
    if(c.length<=80)m.info.push(c);
  }
  return m;
}
/* "Straat 1, Plaats" of "Straat 1, 1234 AB Plaats" in één cel uit elkaar halen */
function splitAddr(addr,city,pc){
  let a=addr,c=city,p=pc;
  const pm=/\b(\d{4})\s?([A-Za-z]{2})\b/.exec(a+' '+c);if(!p&&pm){p=(pm[1]+' '+pm[2]).toUpperCase();a=a.replace(pm[0],'').trim();c=c.replace(pm[0],'').trim()}
  if(!a&&/,/.test(c)&&/\d/.test(c.slice(0,c.lastIndexOf(',')))){a=c.slice(0,c.lastIndexOf(',')).trim();c=c.slice(c.lastIndexOf(',')+1).trim()}
  return{addr:a.replace(/[,\s]+$/,''),city:c.replace(/^[,\s]+/,''),pc:p};
}
const geoKey=(addr,city)=>normTxt(addr)+'|'+normTxt(city);
const pdokAddr=a=>String(a||'').split(/\s+\/\s+|\s+en\s+|;/)[0].trim();
let XGEO={};
function parseAny(rows,opts={}){
  const hi=rows.findIndex(r=>r&&r.some(c=>/kenteken/i.test(clean(c))));
  const hasKlant=hi>=0&&rows[hi].some(c=>/klant|bedrijf|debiteur|relatie/i.test(clean(c))&&!/mail/i.test(clean(c)));
  return hasKlant?parseSheet(rows,opts):parseBlocks(rows,opts);
}
function parseSheet(rows,opts={}){
  const hi=rows.findIndex(r=>r&&r.some(c=>/kenteken/i.test(clean(c))));
  if(hi<0)return{error:'Geen kolom "Kenteken" gevonden. Zorg dat er een rij met kolomnamen boven de gegevens staat.'};
  const H=rows[hi].map(c=>clean(c).toLowerCase()),col=(re,not)=>H.findIndex(h=>re.test(h)&&!(not&&not.test(h)));
  const c={plate:col(/kenteken/),cust:col(/klant|bedrijf|debiteur|relatie/,/mail/),addr:col(/straat|adres/,/mail/),pc:col(/postcode/),city:col(/plaats|stad/),veh:col(/voertuig|merk|model|soort/),
    mail:col(/mail/),login:col(/inlog|login|account/),info:col(/locatie\s*info|parkeer|instructie|bijzonderhe/)};
  const meta=sheetMeta(rows.slice(0,hi)),fixedCust=c.cust<0?clean(opts.cust!=null?opts.cust:meta.cust):'';
  if(c.pc<0&&c.city<0)return{error:'Een kolom "Postcode" of "Plaats" is nodig om de locatie te bepalen.'};
  const dcols=H.map((h,i)=>/datum/.test(h)?i:-1).filter(i=>i>=0);
  if(!dcols.length)return{error:'Geen kolom met "Datum" in de naam gevonden.'};
  const slots=dcols.map((d,k)=>{const end=k+1<dcols.length?dcols[k+1]:H.length;let t=-1,n=-1,x=-1;
    const blank=[];for(let i=d+1;i<end;i++){const h=H[i];if(t<0&&/tijd/.test(h))t=i;else if(x<0&&/geannuleerd|annuler|vervallen/.test(h))x=i;else if(n<0&&/opmerk|notitie|informatie|info/.test(h)&&!/locatie/.test(h))n=i;else if(!h)blank.push(i)}
    return{d,t,n,x,blank,per:H[d].replace(/datum/,'').trim()}});
  const items=[],skipped=[],stat={nb:0,cancel:0,reasons:{}},badCity={},log=[],lookups=new Map();
  const cell=(row,i)=>i>=0?clean(row[i]):'';
  for(let r=hi+1;r<rows.length;r++){
    const row=rows[r]||[],plate=cell(row,c.plate).toUpperCase(),cust=c.cust<0?(fixedCust||'Onbekende klant'):cell(row,c.cust);
    if(!plate&&!cust)continue;
    if(!plate||!cust){skipped.push(`Rij ${r+1}: kenteken of klant ontbreekt`);continue}
    const sp=splitAddr(cell(row,c.addr),cell(row,c.city),cell(row,c.pc).toUpperCase());let{pc,city}=sp;const addr=sp.addr;
    let exact=null;
    if(!pc&&addr&&city){const k=geoKey(addr,city),g=XGEO[k];if(g&&g.ok){pc=g.postcode;exact=g;if(g.city)city=g.city}else if(!g)lookups.set(k,{key:k,addr,city,q:pdokAddr(addr)+' '+city})}
    if(!exact&&!geocode(pc,city)){const k=city||pc||'(leeg)';badCity[k]=(badCity[k]||0)+1;skipped.push(`Rij ${r+1}: plaats "${k}" niet herkend`);log.push({row:r+1,plate,cust,city:city||'',addr,pc,per:'',date:'',time:'',note:'',status:'city',reason:`Plaats "${k}" niet herkend; voeg een postcode toe of maak de locatie handmatig aan`});continue}
    const base={plate,cust,addr,pc,city,veh:cell(row,c.veh),mail:cell(row,c.mail),login:cell(row,c.login)||meta.login,phone:meta.phone,info:cell(row,c.info)||meta.info.join(' \u00b7 '),...(exact?{lat:exact.lat,lng:exact.lng,geoLabel:exact.label}:{})};
    for(const s of slots){
      const raw=row[s.d],date=xDate(raw),tm=s.t>=0?cell(row,s.t):'',note=[cell(row,s.n),...s.blank.map(i=>typeof row[i]==='boolean'?'':cell(row,i)).filter(v=>v&&!/^(true|false|waar|onwaar|x|ja|nee)$/i.test(v))].filter(Boolean).join(' \u00b7 ');
      const tt=s.t>=0?xTime(row[s.t]):{};const L=(status,reason)=>log.push({row:r+1,plate,cust,city,addr,pc,veh:base.veh,from:tt.from||'',to:tt.to||'',per:s.per,date:date||'',time:tm,note,status,reason});
      if(!date){const v=clean(raw);if(v){stat.nb++;stat.reasons[v]=(stat.reasons[v]||0)+1;L('nb',v)}continue}
      if(s.x>=0&&cell(row,s.x)){stat.cancel++;L('cancel','Geannuleerd: '+cell(row,s.x));continue}
      let t={};
      if(s.t>=0){t=xTime(row[s.t]);if(!t.from&&tm){stat.nb++;stat.reasons[tm]=(stat.reasons[tm]||0)+1;L('nb',tm);continue}}
      if(/^\s*(g?e?a?nnul|annul|afgezegd)/i.test(note)){stat.cancel++;L('cancel',note);continue}
      if(/^\s*(niet beschikbaar|vervalt|vervallen)/i.test(note)){stat.nb++;stat.reasons[note]=(stat.reasons[note]||0)+1;L('nb',note);continue}
      items.push({...base,date,from:t.from||'',to:t.to||'',note,li:log.length});L('ok','');
    }
  }
  return{items,skipped,stat,badCity,log,lookups:[...lookups.values()],noCust:c.cust<0,cust:fixedCust,meta};
}
const isSample=()=>D.customers.some(c=>/^c\d+$/.test(c.id))&&D.customers.some(c=>c.name==='Autobedrijf Van Dijk');
function removeSample(){
  D.customers=D.customers.filter(c=>!/^c\d+$/.test(c.id));D.locations=D.locations.filter(l=>!/^l\d+$/.test(l.id));D.jobs=D.jobs.filter(j=>!/^j\d+$/.test(j.id));
  delete D.plans['2026-10-29'];delete D.plans['2026-10-30'];index();
}
let XIMP=null;
const todayIso=()=>new Date().toISOString().slice(0,10);
function xItems(){if(!XIMP)return[];const fut=$('#xfuture')&&$('#xfuture').checked,t=todayIso();return XIMP.items.filter(i=>!fut||i.date>=t)}
const locKey=i=>i.cust.toLowerCase()+'|'+(i.pc?i.pc.replace(/\s/g,''):(i.addr+'|'+i.city).toLowerCase());
function openXlsxImport(){
  XIMP=null;FORM=null;const m=$('#modal');
  m.innerHTML=`<div class="dlg wide" role="dialog" aria-modal="true" aria-labelledby="xT"><h3 id="xT">Opdrachten importeren uit Excel</h3>
  <p class="note" style="margin-bottom:10px">Kies een bestand. Je ziet eerst precies welke regels worden ingepland en welke niet; er verandert niets tot je op Importeren klikt.
  <details style="display:inline"><summary class="small" style="display:inline;cursor:pointer;color:var(--accent)">Welke lijsten werken?</summary><span class="small"> Eén rij per voertuig met Kenteken, Klant, Adres en Postcode en/of Plaats (ook "Straat 1, Plaats" in één kolom). Ontbreekt de postcode, dan zoekt de app die op via PDOK; ontbreekt de kolom Klant, dan komt de klantnaam uit de titel boven de lijst. Lijsten met meerdere klanten onder elkaar (titelregel, kolomnamen, voertuigen; steeds herhaald) werken ook: elke titel wordt een klant. Per maand een kolom Datum met daarna Tijd (bijv. "08.30 tot 09.00"), en eventueel Informatie en Geannuleerd. "Niet beschikbaar" of een ingevulde Geannuleerd wordt overgeslagen.</span></details></p>
  <div class="ximp-top">
    <label class="fld"><span>Bestand (.xlsx, .xls of .csv)</span><input type="file" id="xf" accept=".xlsx,.xls,.csv"></label>
    <label class="fld"><span>Type reiniging</span><select id="xtype">${D.types.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} (${t.dur} min)</option>`).join('')}</select></label>
    <label class="fld"><span>Speling (min)</span><input type="number" id="xslack" value="0" min="0" step="5"></label>
  </div>
  <div class="ximp-opts">
    <label class="chk"><input type="checkbox" id="xfuture" checked> Alleen datums vanaf vandaag</label>
    <label class="chk"><input type="checkbox" id="xslot" checked> Duur = lengte van het tijdvak</label>
    <label class="chk"><input type="checkbox" id="xclear"${isSample()?' checked':''}> Voorbeeldgegevens eerst verwijderen</label>
  </div>
  <div id="xprev"></div>
  <div class="dlg-foot"><button type="button" class="btn ghost" data-act="csvimport">Of plak regels (CSV)</button><span class="sp"></span><button type="button" class="btn" data-act="dlgx">Annuleren</button><button type="button" class="btn primary" id="xgo" data-act="xdo" disabled>Importeren</button></div></div>`;
  m.hidden=false;$('#xf').focus();
}
function readXlsx(file){
  const out=$('#xprev');
  if(typeof XLSX==='undefined'){out.innerHTML='<p class="hint" style="color:var(--bad)">De Excel-lezer is niet geladen. Controleer de internetverbinding en open de pagina opnieuw, of sla het bestand op als CSV en plak de regels.</p>';return}
  out.innerHTML='<p class="hint">Bestand lezen…</p>';
  const fr=new FileReader();
  fr.onload=()=>{try{
    const wb=XLSX.read(new Uint8Array(fr.result),{type:'array'});let res=null;
    for(const n of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null,blankrows:true});const r=parseAny(rows);if(!res||((r.items&&r.items.length||r.lookups&&r.lookups.length)&&!(res.items&&res.items.length)))res={...r,sheet:n,rows};if(r.items&&r.items.length)break}
    if(res.error){out.innerHTML=`<p class="hint" style="color:var(--bad)">${esc(res.error)}</p>`;$('#xgo').disabled=true;return}
    XIMP={...res,file:file.name};xLookup();
  }catch(e){out.innerHTML='<p class="hint" style="color:var(--bad)">Dit bestand kon niet gelezen worden. Is het een Excel- of CSV-bestand?</p>'}};
  fr.readAsArrayBuffer(file);
}
/* Ontbrekende postcodes opzoeken via PDOK (op straat + plaats), daarna opnieuw inlezen */
async function xLookup(){
  const X=XIMP;if(!X)return;
  if(!SERVER||!X.lookups||!X.lookups.length){renderXPrev();return}
  const out=$('#xprev'),todo=X.lookups;X.geoRes=X.geoRes||[];
  out.innerHTML=`<p class="hint">Postcodes opzoeken via PDOK\u2026 0 van ${todo.length}</p>`;
  try{
    for(let i=0;i<todo.length;i+=20){
      const part=todo.slice(i,i+20);
      const d=await withPw(()=>api('/api/adres',{method:'POST',body:JSON.stringify({items:part.map((l,k)=>({id:'x'+(i+k),q:l.q,type:'adres'}))})}));
      for(const r of d.results||[]){const l=part[+r.id.slice(1)-i];if(!l)continue;
        const a=normTxt(l.city),b=normTxt(r.city),cityOk=!a||!b||a===b||a.includes(b)||b.includes(a);
        const ok=r.ok&&cityOk&&r.lat>50&&r.lat<54&&r.lng>3&&r.lng<8;
        XGEO[l.key]=ok?{ok:true,postcode:String(r.postcode||'').replace(/^(\d{4})\s?([A-Za-z]{2})$/,'$1 $2').toUpperCase(),city:r.city,lat:r.lat,lng:r.lng,label:r.label}:{ok:false,why:r.ok?`PDOK vond "${r.label}", in een andere plaats`:(r.error||'Niet gevonden')};
        X.geoRes.push({addr:l.addr,city:l.city,...XGEO[l.key]})}
      if($('#xprev'))out.innerHTML=`<p class="hint">Postcodes opzoeken via PDOK\u2026 ${Math.min(i+20,todo.length)} van ${todo.length}</p>`;
    }
  }catch(e){X.geoErr=apiErr(e)}
  if(XIMP!==X)return;xReparse();
}
/* Factureren aan: een leasemaatschappij wordt de klant; de bedrijven uit de lijst worden locaties met hun eigen naam */
function xBillName(X){if(X.billTo==='__new')return clean(X.billToNew||'');const c=D.customers.find(c=>c.id===X.billTo);return c?c.name:''}
function xBillToHtml(X){
  const cs=D.customers.slice().sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  return`<div class="row" style="align-items:flex-end;gap:10px;flex-wrap:wrap"><label class="fld" style="max-width:360px;flex:1 1 260px"><span>Factureren aan</span><select id="xbill">
    <option value=""${!X.billTo?' selected':''}>Elk bedrijf in de lijst is zelf de klant</option>
    <optgroup label="Leasemaatschappij of verhuurder">${cs.map(c=>`<option value="${esc(c.id)}"${X.billTo===c.id?' selected':''}>${esc(c.name)}${c.bcNo?' ('+esc(c.bcNo)+')':''}</option>`).join('')}</optgroup>
    <option value="__new"${X.billTo==='__new'?' selected':''}>Nieuwe leasemaatschappij…</option></select></label>
    ${X.billTo==='__new'?`<label class="fld" style="max-width:300px;flex:1 1 220px"><span>Naam leasemaatschappij</span><input id="xbillnew" value="${esc(X.billToNew||'')}" placeholder="bijv. Athlon"></label>`:''}</div>
    <p class="hint" style="margin:0">${X.billTo?'De bedrijven uit de lijst blijven zelf de klant in de planning; alleen de factuur gaat naar deze leasemaatschappij. Op de factuur staan de kentekens gegroepeerd per bedrijf.':'Komt de lijst van een lease- of verhuurmaatschappij? Kies die hier, dan gaat de factuur daarheen. De bedrijven blijven gewoon de klant in de planning.'}</p>`;
}
function xReparse(){const X=XIMP;if(!X)return;const r=parseAny(X.rows,{cust:X.custEdit,names:X.names});XIMP={...X,...r};renderXPrev()}
/* Voorbeeld: elke regel uit de lijst met wat ermee gebeurt */
const XST={imp:['Wordt ingepland','ok'],dup:['Bestaat al',''],past:['In het verleden',''],nb:['Niet beschikbaar','warn'],cancel:['Geannuleerd','warn'],city:['Plaats onbekend','bad']};
function xRows(X){const fut=$('#xfuture')&&$('#xfuture').checked,t=todayIso();
  const have=new Set(D.jobs.map(j=>String(j.plate).toUpperCase().replace(/[^A-Z0-9]/g,'')+'|'+j.date));
  return(X.log||[]).map((e,i)=>{let st=e.status;
    if(st==='ok')st=fut&&e.date&&e.date<t?'past':have.has(String(e.plate).toUpperCase().replace(/[^A-Z0-9]/g,'')+'|'+e.date)?'dup':'imp';
    return{...e,i,st}})}
/* Duur per regel, volgens dezelfde regels als bij het importeren */
function xDurFn(){const slot=$('#xslot')&&$('#xslot').checked,typ=TYP[$('#xtype')&&$('#xtype').value]||D.types[0]||{dur:30,name:''};
  const share={};xItems().forEach(it=>{if(it.from&&it.to){const k=locKey(it)+'|'+it.date+'|'+it.from+'|'+it.to;share[k]=(share[k]||0)+1}});
  return r=>{const len=r.from&&r.to?t2m(r.to)-t2m(r.from):0;
    if(slot&&len>0&&!r.win){const n=share[locKey({cust:String(r.cust||''),pc:r.pc||'',addr:r.addr||'',city:r.city||''})+'|'+r.date+'|'+r.from+'|'+r.to]||1;return{m:Math.max(10,Math.floor(len/n)),src:n>1?`tijdslot gedeeld door ${n}`:'tijdslot'}}
    return{m:typ.dur,src:r.win&&slot&&len>0?`venster, dus ${typ.name}`:typ.name}}}
function xPvBody(X){const pv=X.pv||(X.pv={f:'imp',q:''}),rows=xRows(X),q=normQ(pv.q).trim(),words=q?q.split(/\s+/):[];
  const list=rows.filter(r=>(pv.f==='all'||(pv.f==='skip'?!['imp','dup'].includes(r.st):r.st===pv.f))&&(!words.length||words.every(w=>normQ([r.plate,r.veh,r.cust,r.addr,r.pc,r.city,r.note,r.reason,r.date].join(' ')).includes(w))))
    .sort((a,b)=>String(a.date||'9').localeCompare(String(b.date||'9'))||String(a.from||a.time||'').localeCompare(String(b.from||b.time||''))||String(a.cust).localeCompare(String(b.cust),'nl'));
  const shown=list.slice(0,500),dur=xDurFn();
  const body=shown.map(r=>{const s=XST[r.st]||[r.st,''],skip=!['imp'].includes(r.st),tm=r.from?r.from+(r.to?'\u2013'+r.to:''):(r.time||'');
    return`<tr${skip?' class="skip"':''}><td><span class="chip ${s[1]}">${esc(s[0])}</span></td><td class="small" style="white-space:nowrap">${r.date?esc(fdate(r.date,{weekday:'short',day:'numeric',month:'short'})):'<span class="muted">\u2014</span>'}</td><td class="mono small" style="white-space:nowrap">${esc(tm||'hele dag')}</td><td class="small" style="white-space:nowrap">${['imp','dup'].includes(r.st)?(d=>`<b>${d.m} min</b><div class="muted">${esc(d.src)}</div>`)(dur(r)):'<span class="muted">\u2014</span>'}</td><td>${plateHtml(r.plate)}${r.veh?`<div class="small muted">${esc(r.veh)}</div>`:''}</td><td><b>${esc(r.cust)}</b></td><td class="small">${esc(r.addr||'')}${r.pc||r.city?`<div class="muted">${esc([r.pc,r.city].filter(Boolean).join(' '))}</div>`:''}</td><td class="small">${r.st==='imp'?esc(r.note||''):`<span class="muted">${esc(r.reason||r.note||'')}</span>`}</td></tr>`}).join('');
  return{body:body||`<tr><td colspan="8" class="empty">Geen regels${q?' gevonden voor deze zoekterm':' in deze selectie'}</td></tr>`,more:list.length-shown.length,rows}}
function xScrollTbl(){setTimeout(()=>{const t=$('.xpv');if(t)t.scrollIntoView({behavior:'smooth',block:'center'})},30)}
function xPvRefresh(){const X=XIMP;if(!X)return;const r=xPvBody(X),b=$('#xpvBody');if(b)b.innerHTML=r.body;const m=$('#xpvMore');if(m)m.textContent=r.more>0?`En nog ${r.more} regels; zoek om ze te vinden.`:''}
/* Details onder een aangeklikte tegel */
function xDetHtml(X,ctx){const k=X.det;if(!k)return'';const{items,custs,knownLoc,lk,cnt,rows}=ctx;
  const head=(t,sub)=>`<h5>${t}<span class="small muted" style="font-weight:400">${sub||''}</span><span class="sp" style="flex:1"></span><button type="button" class="btn sm ghost" data-act="xdet" data-k="${k}">Sluiten</button></h5>`;
  const tbl=(th,tr)=>`<div class="tbl-wrap"><table><thead><tr>${th.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${tr||`<tr><td colspan="${th.length}" class="empty">Niets om te tonen</td></tr>`}</tbody></table></div>`;
  const go=(q)=>`data-act="xpvq" data-q="${esc(q)}" title="Toon deze regels in de tabel"`;
  const nd=d=>esc(fdate(d,{weekday:'short',day:'numeric',month:'short'}));
  const grp=(keyf)=>{const m=new Map();items.forEach(i=>{const k=keyf(i);if(!m.has(k))m.set(k,[]);m.get(k).push(i)});return[...m.entries()]};
  if(k==='veh'){const g=grp(i=>i.plate).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
    return head('Voertuigen',` \u00b7 klik op een regel om de afspraken te zien`)+tbl(['Kenteken','Voertuig','Klant','Afspraken','Datums'],g.map(([pl,its])=>{const ds=[...new Set(its.map(i=>i.date))].sort();return`<tr ${go(pl)}><td>${plateHtml(pl)}</td><td class="small">${esc(its[0].veh||'')}</td><td>${esc(its[0].cust)}</td><td>${its.length}</td><td class="small">${ds.slice(0,4).map(nd).join(', ')}${ds.length>4?' \u2026':''}</td></tr>`}).join(''))}
  if(k==='cus'){const g=grp(i=>i.cust).sort((a,b)=>a[0].localeCompare(b[0],'nl'));
    return head('Klanten',` \u00b7 ${X.billTo?'factuur naar '+esc(xBillName(X)||'\u2026'):'elk bedrijf is zelf de klant'}`)+tbl(['Klant','','Voertuigen','Locaties','Opdrachten'],g.map(([c,its])=>`<tr ${go(c)}><td><b>${esc(c)}</b></td><td>${custs.includes(c.toLowerCase())?'<span class="chip">bestaat al</span>':'<span class="chip acc">nieuw</span>'}</td><td>${new Set(its.map(i=>i.plate)).size}</td><td>${new Set(its.map(locKey)).size}</td><td>${its.length}</td></tr>`).join(''))}
  if(k==='loc'){const g=grp(locKey).sort((a,b)=>a[1][0].cust.localeCompare(b[1][0].cust,'nl'));const GL={pdok:['exact (PDOK)','ok'],manual:['exact','ok'],pc6:['postcode','ok'],pc4:['postcode (4 cijfers)','acc'],plaats:['geschat op plaats','warn']};
    return head('Locaties',` \u00b7 positie bepaalt de rijtijden`)+tbl(['Klant','Adres','Postcode en plaats','Positie','','Opdrachten'],g.map(([key,its])=>{const i=its[0],geo=i.lat?{geo:'pdok'}:(geocode(i.pc,i.city)||{}),gl=GL[geo.geo]||[geo.geo?geo.geo:'onbekend',geo.geo?'':'bad'];const isNew=!knownLoc.has(lk(i.cust,i.pc,i.addr,i.city));
      return`<tr ${go(i.addr||i.city||i.cust)}><td>${esc(i.cust)}</td><td class="small">${esc(i.addr||'')}</td><td class="small">${esc([i.pc,i.city].filter(Boolean).join(' '))}</td><td><span class="chip ${gl[1]}">${esc(gl[0])}</span></td><td>${isNew?'<span class="chip acc">nieuw</span>':'<span class="chip">bestaat al</span>'}</td><td>${its.length}</td></tr>`}).join(''))}
  if(k==='per'){const g=grp(i=>i.date).sort((a,b)=>a[0].localeCompare(b[0]));
    return head('Per datum',` \u00b7 rood = op die dag werkt geen medewerker`)+tbl(['Datum','Opdrachten','Voertuigen','Tijden','Plaatsen','Medewerkers'],g.map(([d,its])=>{const ts=its.map(i=>i.from).filter(Boolean).sort(),te=its.map(i=>i.to).filter(Boolean).sort(),cs=[...new Set(its.map(i=>i.city===i.city.toUpperCase()?i.city.charAt(0)+i.city.slice(1).toLowerCase():i.city))],n=wday(d),nw=D.workers.filter(w=>(w.days||[]).includes(n)&&!(w.absent||[]).includes(d)).length;
      return`<tr ${go(d)}><td style="white-space:nowrap"><b>${nd(d)}</b></td><td>${its.length}</td><td>${new Set(its.map(i=>i.plate)).size}</td><td class="mono small">${ts.length?ts[0]+'\u2013'+(te[te.length-1]||''):'hele dag'}</td><td class="small">${esc(cs.slice(0,5).join(', '))}${cs.length>5?' \u2026':''}</td><td>${nw?nw:'<span class="chip bad">geen</span>'}</td></tr>`}).join(''))}
  if(k==='skip'){const R=[['past','In het verleden','Datum ligt v\u00f3\u00f3r vandaag; zet "Alleen datums vanaf vandaag" uit om ze toch te importeren.'],['nb','Niet beschikbaar','Volgens de lijst kon de auto niet.'],['cancel','Geannuleerd','In de kolom Geannuleerd staat iets ingevuld.'],['city','Plaats onbekend','Adres niet gevonden; voeg een postcode toe of maak de locatie handmatig aan.'],['dup','Bestaat al','Staat al in de planning (zelfde kenteken en datum).']].filter(r=>cnt[r[0]]);
    const reasons={};rows.filter(r=>r.st==='nb'||r.st==='cancel').forEach(r=>{const t=(r.reason||r.note||'').trim();if(t)reasons[t]=(reasons[t]||0)+1});const top=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,6);
    return head('Niet ingepland',` \u00b7 klik om die regels te tonen`)+`<div class="xreason">${R.map(([st,l,why])=>`<button type="button" class="btn sm" data-act="xpvf" data-f="${st}" title="${esc(why)}">${esc(l)} <b>${cnt[st]}</b></button>`).join('')}</div>
      <ul class="xwarn" style="margin-top:8px">${R.map(([st,l,why])=>`<li><b>${esc(l)}:</b> ${esc(why)}</li>`).join('')}</ul>${top.length?`<p class="small muted" style="margin:8px 0 0">Meest genoemd in de lijst: ${top.map(([t,n])=>`"${esc(t)}" ${n}\u00d7`).join(', ')}</p>`:''}`}
  return'';
}
function renderXPrev(){
  const X=XIMP,out=$('#xprev'),clear=$('#xclear').checked,items=xItems();
  const custs=D.customers.filter(c=>!(clear&&/^c\d+$/.test(c.id))).map(c=>clean(c.name).toLowerCase());
  const plates=new Set(items.map(i=>i.plate)),cu=new Set(items.map(i=>i.cust.toLowerCase())),locs=new Set(items.map(locKey));
  const newC=[...cu].filter(c=>!custs.includes(c)).length;
  const lk=(c,pc,a,ci)=>normQ(c)+'|'+(pc?String(pc).replace(/\s/g,'').toUpperCase():normQ(a+'|'+ci));
  const knownLoc=new Set(D.locations.filter(l=>!(clear&&/^l\d+$/.test(l.id))).map(l=>lk((CUS[l.customerId]||{}).name,l.postcode,l.address,l.city)));
  const newL=[...new Set(items.map(i=>lk(i.cust,i.pc,i.addr,i.city)))].filter(k=>!knownLoc.has(k)).length;
  const dates=[...new Set(items.map(i=>i.date))].sort();
  const wk=dates.filter(d=>{const n=wday(d);return!D.workers.some(w=>(w.days||[]).includes(n))});
  let far=0;const seen={};items.forEach(i=>{const k=locKey(i);if(seen[k])return;seen[k]=1;const g=geocode(i.pc,i.city);if(!g||!D.workers.length)return;const near=Math.min(...D.workers.map(w=>hav(g,{lat:+w.lat,lng:+w.lng})));if(near>far)far=near});
  const est=new Set(items.filter(i=>(geocode(i.pc,i.city)||{}).geo==='plaats').map(locKey)).size;
  const pv=xPvBody(X),cnt={};pv.rows.forEach(r=>cnt[r.st]=(cnt[r.st]||0)+1);
  const nImp=cnt.imp||0,nDup=cnt.dup||0,nSkip=pv.rows.length-nImp-nDup;
  const st=X.stat||{nb:0,cancel:0,reasons:{}};
  // aandachtspunten
  const W=[];
  const bc=Object.entries(X.badCity||{});
  if(bc.length)W.push(['bad',`${X.skipped.length} rij(en) overgeslagen omdat de plaats onbekend is: ${bc.map(([k,v])=>esc(k)+' ('+v+')').join(', ')}. Voeg een postcode toe of maak de locatie handmatig aan.`]);
  else if(X.skipped.length)W.push(['bad',`${X.skipped.length} rij(en) zonder kenteken of klant overgeslagen: ${X.skipped.slice(0,3).map(esc).join('; ')}${X.skipped.length>3?' \u2026':''}`]);
  if(wk.length)W.push(['warn',`${wk.length} datum(s) vallen op een dag waarop geen medewerker werkt: ${wk.slice(0,5).map(d=>esc(fdate(d,{weekday:'short',day:'numeric',month:'short'}))).join(', ')}${wk.length>5?' \u2026':''}.`]);
  if(D.workers.length&&far>60)W.push(['warn',`Sommige locaties liggen tot ${Math.round(far)} km van de dichtstbijzijnde medewerker.`]);
  const gr=X.geoRes||[],grOk=gr.filter(g=>g.ok).length;
  if(gr.length)W.push([gr.length-grOk?'warn':'',`${grOk} van ${gr.length} adressen zonder postcode gevonden via PDOK. <details style="display:inline"><summary style="display:inline;cursor:pointer;color:var(--accent)">Bekijk</summary><div class="tbl-wrap" style="max-height:180px;overflow:auto;margin-top:6px"><table><thead><tr><th>Adres in de lijst</th><th>Gevonden</th></tr></thead><tbody>${gr.map(g=>`<tr><td class="small">${esc(g.addr)}, ${esc(g.city)}</td><td class="small">${g.ok?`<span class="chip ok">${esc(g.postcode)}</span> ${esc(g.label)}`:`<span style="color:var(--bad)">${esc(g.why)}</span>`}</td></tr>`).join('')}</tbody></table></div></details>`]);
  else if(X.geoErr)W.push(['bad',`Postcodes opzoeken via PDOK lukte niet: ${esc(X.geoErr)} De positie wordt geschat op basis van de plaats.`]);
  if(est)W.push(['',`${est} locatie(s) zonder postcode krijgen een geschatte positie op basis van de plaats.`]);
  if(nDup)W.push(['',`${nDup} regel(s) staan al in de planning (zelfde kenteken en datum) en worden niet dubbel aangemaakt.`]);
  // blokken (lijst met meerdere klanten)
  const blkH=X.multi&&X.blocks?`<details class="ximp-sec"${X.blocks.length<=6?' open':''}><summary style="cursor:pointer"><b>Klanten in de lijst (${X.blocks.length})</b> <span class="small muted">namen zijn aan te passen</span></summary><div class="tbl-wrap" style="max-height:220px;overflow:auto;margin-top:8px"><table><thead><tr><th>Klant</th><th>Voertuigen</th><th>Afspraken</th><th>Vanaf vandaag</th></tr></thead><tbody>${X.blocks.map(b=>`<tr><td><input class="mini" data-xname="${b.i}" value="${esc(b.cust)}" aria-label="Klantnaam blok rij ${b.row}" style="width:100%;min-width:180px"><div class="small muted">rij ${b.row}${b.meta.info.length?' \u00b7 '+esc(b.meta.info.filter(x=>!/^datum/i.test(x)).slice(0,2).join(' \u00b7 ')):''}</div></td><td>${b.plates}</td><td>${b.ok}</td><td><b>${b.future}</b></td></tr>`).join('')}</tbody></table></div></details>`:'';
  const custH=(X.noCust?`<label class="fld" style="max-width:360px"><span>Klant (geen kolom Klant in de lijst${X.meta&&X.meta.cust?', gevonden in de titel':''})</span><input id="xcust" value="${esc(X.custEdit!=null?X.custEdit:X.cust)}" placeholder="Naam van de klant"></label>`:'')+xBillToHtml(X);
  const tile=(k,cls,inner,more)=>`<button type="button" class="${cls}" data-act="xdet" data-k="${k}" aria-pressed="${X.det===k}">${inner}<span class="xmore">${X.det===k?'Verberg details':(more||'Details')} \u203a</span></button>`;
  const f=X.pv.f,segB=(k,l,n)=>`<button type="button" data-act="xpvf" data-f="${k}" aria-pressed="${f===k}">${l} <b>${n}</b></button>`;
  const per=dates.length?(dates.length===1?esc(fdate(dates[0],{day:'numeric',month:'short'})):`${esc(fdate(dates[0],{day:'numeric',month:'short'}))} \u2013 ${esc(fdate(dates[dates.length-1],{day:'numeric',month:'short'}))}`):'\u2014';
  out.innerHTML=`<div class="ximp-sec"><h4>${esc(X.file)} <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">\u00b7 blad "${esc(X.sheet)}"</span></h4>
  <div class="xkpis">
    ${tile('imp','xkpi main',`<b>${nImp}</b><span>opdrachten worden ingepland</span>`,'Toon in de tabel')}
    ${tile('veh','xkpi',`<b>${plates.size}</b><span>voertuigen</span>`)}
    ${tile('cus','xkpi',`<b>${cu.size}</b><span>klanten${newC?` \u00b7 ${newC} nieuw`:''}</span>`)}
    ${tile('loc','xkpi',`<b>${locs.size}</b><span>locaties${newL?` \u00b7 ${newL} nieuw`:''}</span>`)}
    ${tile('per','xkpi',`<b style="font-size:16px;line-height:1.7">${per}</b><span>${dates.length} datum(s)</span>`,'Per datum')}
    ${tile('skip','xkpi'+(nSkip?' warn':''),`<b>${nSkip}</b><span>niet ingepland${nSkip?` (${[cnt.past?cnt.past+' in het verleden':'',cnt.nb?cnt.nb+' niet beschikbaar':'',cnt.cancel?cnt.cancel+' geannuleerd':'',cnt.city?cnt.city+' plaats onbekend':''].filter(Boolean).join(', ')})`:''}</span>`,'Waarom?')}
  </div>
  <div id="xdet">${(h=>h?`<div class="xdet">${h}</div>`:'')(xDetHtml(X,{items,custs,knownLoc,lk,cnt,rows:pv.rows}))}</div>
  ${W.length?`<div style="margin-top:10px"><ul class="xwarn">${W.map(([c,t])=>`<li class="${c}">${t}</li>`).join('')}</ul></div>`:''}</div>
  <div class="ximp-sec"><h4>Klant en facturatie</h4>${custH}</div>${blkH}
  <div class="ximp-sec"><h4>Regels uit de lijst</h4>
  <div class="xpv-bar"><div class="seg">${segB('imp','Wordt ingepland',nImp)}${segB('skip','Niet ingepland',nSkip)}${nDup?segB('dup','Bestaat al',nDup):''}${segB('all','Alles',pv.rows.length)}</div>
  <input class="mini" id="xpvq" type="search" placeholder="Zoek kenteken, klant, plaats\u2026" value="${esc(X.pv.q||'')}" style="flex:1 1 200px;max-width:320px" autocomplete="off"></div>
  <div class="xpv"><table><thead><tr><th>Status</th><th>Datum</th><th>Tijd</th><th>Duur</th><th>Kenteken</th><th>Klant</th><th>Adres</th><th>Opmerking / reden</th></tr></thead><tbody id="xpvBody">${pv.body}</tbody></table></div>
  <p class="hint" id="xpvMore" style="margin:6px 0 0">${pv.more>0?`En nog ${pv.more} regels; zoek om ze te vinden.`:''}</p>
  <p class="hint" style="margin:4px 0 0">Duur: met "Duur = lengte van het tijdvak" aan telt het tijdslot uit de lijst (gedeeld als meer auto's op hetzelfde adres hetzelfde slot hebben); een venster als "tussen 08.00 en 12.00", alleen een begintijd of geen tijd gebruikt de standaardduur van het gekozen type.</p>
  <p class="hint" style="margin:4px 0 0">Opnieuw importeren is veilig: wat al bestaat (zelfde kenteken, datum en locatie) wordt overgeslagen. Na het importeren staat alles ook in het Importlog.</p></div>`;
  const go=$('#xgo');go.disabled=!nImp;go.textContent=nImp?`${nImp} opdracht${nImp===1?'':'en'} importeren`:'Importeren';
}
function doXImport(){
  const items=xItems();if(!items.length)return;
  const log=XIMP.log.map(e=>({...e})),fileName=XIMP.file,fut0=$('#xfuture').checked,today0=todayIso();
  log.forEach(e=>{if(e.status==='ok'&&fut0&&e.date<today0){e.status='past';e.reason='Datum ligt voor vandaag'}});
  const type=$('#xtype').value,slack=+$('#xslack').value||0,slotDur=$('#xslot').checked;
  if(XIMP.billTo==='__new'&&!xBillName(XIMP)){toast('Vul de naam van de leasemaatschappij in, of kies een bestaande klant bij Factureren aan.');const i=$('#xbillnew');if(i)i.focus();return}
  if($('#xclear').checked)removeSample();
  let n=0,dup=0,newC=0,newL=0;const dates=new Set(),newLocs=[];
  let billCu=null;
  if(XIMP.billTo==='__new'){const nm=xBillName(XIMP);billCu=D.customers.find(c=>clean(c.name).toLowerCase()===nm.toLowerCase());if(!billCu){billCu={id:uid('c'),name:nm,contact:'',phone:'',email:'',login:''};D.customers.push(billCu);newC++}}
  else if(XIMP.billTo)billCu=D.customers.find(c=>c.id===XIMP.billTo)||null;
  if(billCu)log.forEach(e=>{e.billTo=billCu.id});
  const share={};items.forEach(it=>{if(it.from&&it.to){const k=locKey(it)+'|'+it.date+'|'+it.from+'|'+it.to;share[k]=(share[k]||0)+1}});
  for(const it of items){
    let cu=D.customers.find(x=>x!==billCu&&clean(x.name).toLowerCase()===it.cust.toLowerCase());
    if(!cu){cu={id:uid('c'),name:it.cust,contact:'',phone:it.phone||'',email:it.mail||'',login:it.login||''};D.customers.push(cu);newC++}
    else{if(!cu.email&&it.mail)cu.email=it.mail;if(!cu.login&&it.login)cu.login=it.login;if(!cu.phone&&it.phone)cu.phone=it.phone}
    if(billCu)cu.billTo=billCu.id;
    const npc=it.pc.replace(/\s/g,''),na=it.addr.toLowerCase(),nc=it.city.toLowerCase();
    let lo=D.locations.find(l=>l.customerId===cu.id&&(npc?String(l.postcode||'').replace(/\s/g,'').toUpperCase()===npc&&(!it.addr||!l.address||clean(l.address).toLowerCase()===na):clean(l.address).toLowerCase()===na&&clean(l.city).toLowerCase()===nc));
    if(!lo){const city=it.city&&it.city===it.city.toUpperCase()?it.city.toLowerCase().replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toUpperCase()):it.city||'';lo={id:uid('l'),customerId:cu.id,name:it.addr||'Locatie',address:it.addr,postcode:it.pc,city,info:it.info||'',...(it.lat?{lat:it.lat,lng:it.lng,geo:'pdok',pdokLabel:it.geoLabel||''}:geocode(it.pc,it.city))};D.locations.push(lo);newLocs.push(lo);newL++}
    else if(!lo.info&&it.info)lo.info=it.info;
    if(D.jobs.some(j=>j.plate===it.plate&&j.date===it.date&&j.locationId===lo.id)){dup++;if(log[it.li]){log[it.li].status='dup';log[it.li].reason='Bestaat al (zelfde kenteken, datum en locatie)'}continue}
    let from=it.from,to=it.to;const len=from&&to?t2m(to)-t2m(from):0;
    if(slack){if(from)from=m2t(Math.max(0,t2m(from)-slack));if(to)to=m2t(Math.min(1439,t2m(to)+slack))}
    const jid=uid('j');if(log[it.li]){log[it.li].status='imp';log[it.li].jobId=jid}
    D.jobs.push({id:jid,plate:it.plate,vehicle:it.veh,locationId:lo.id,date:it.date,from,to,type,duration:slotDur&&len>0&&!it.win?Math.max(10,Math.floor(len/(share[locKey(it)+'|'+it.date+'|'+it.from+'|'+it.to]||1))):'',priority:2,notes:it.note});n++;dates.add(it.date);
  }
  index();closeForm();XIMP=null;
  const ds=[...dates].sort(),today=todayIso();
  if(ds.length){S.date=ds.find(d=>d>=today)||ds[0];S.tab='planning';S.selLoc=null}
  D.importLog={file:fileName,at:Date.now(),entries:log};importLogs();const lid=uid('il');D.importLogs=D.importLogs.filter(x=>x.at!==D.importLog.at).concat({id:lid,...D.importLog}).slice(-10);S.logId=lid;delete D.importLog;
  const msg=`${n} opdrachten geïmporteerd (${newC} nieuwe klanten, ${newL} nieuwe locaties)${dup?`, ${dup} dubbele overgeslagen`:''}`;
  if(SERVER&&n){save();importPipeline(ds,newLocs,msg);return}
  replan(ds);
  toast(`${msg}. Planning gemaakt voor ${ds.length} datum(s).`);
  openLog();
}
/* ---------- Excel met meerdere klantblokken: titelregel, kolomnamen, voertuigregels (herhaald) ---------- */
const PLATE_RE=/^(?=.*\d)(?=.*[A-Z])[A-Z0-9]{1,3}-[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/;
const isPlate=v=>{const p=clean(v).toUpperCase().replace(/\s/g,'');return PLATE_RE.test(p)||(/^[A-Z0-9]{6}$/.test(p)&&/\d/.test(p)&&/[A-Z]/.test(p))};
const MONTHS_RE=/\b(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\b\s*,/i;
function custFromTitle(t,login){
  let c=clean(t).replace(/^overzicht\s+(gereinigde\s+)?(auto['’]?s|voertuigen|wagens)?\s*(van|voor)?\s*/i,'').split(':')[0].split(/\s[-\u2013]\s/)[0].trim();
  if(!c&&login){const m=/@([\w.-]+)/.exec(login);if(m)c=m[1].length<=4?m[1].toUpperCase():m[1].charAt(0).toUpperCase()+m[1].slice(1)}
  if(c&&c===c.toLowerCase())c=c.replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase());
  return c;
}
let CITY_KEYS=null;
function cityFromText(t){
  if(!CITY_KEYS)CITY_KEYS=Object.keys(CITY).concat(Object.keys(CITY_ALIAS)).sort((a,b)=>b.length-a.length);
  const u=' '+clean(t).toUpperCase().replace(/[^A-ZÀ-ſ' -]/g,' ').replace(/\s+/g,' ')+' ';
  const k=CITY_KEYS.find(k=>k.length>3&&u.includes(' '+k+' '));if(!k)return'';
  const n=CITY_ALIAS[k]||k;return n.toLowerCase().replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toUpperCase()).replace(/^'S-/i,"'s-");
}
function parseAddrCell(a,c,fallbackCity){
  a=clean(a).replace(/\s+[&+]\s+/g,' & ');c=clean(c);let pc='';
  const pm=/\b(\d{4})\s?([A-Za-z]{2})\b/.exec(a);
  if(pm){pc=(pm[1]+' '+pm[2]).toUpperCase();const after=a.slice(pm.index+pm[0].length).replace(/^[\s,]+/,'').trim();a=a.slice(0,pm.index).replace(/[\s,]+$/,'').trim();if(!c)c=after}
  else if(!c&&a.includes(',')){c=a.slice(a.lastIndexOf(',')+1).trim();a=a.slice(0,a.lastIndexOf(',')).trim()}
  if(!c){const fc=cityFromText(a);if(fc&&!/\d/.test(a)){c=fc}else c=fallbackCity||''}
  return{addr:a,city:c,pc};
}
function xToken(v){
  if(v==null||v==='')return{k:'empty'};
  if(typeof v==='boolean')return{k:'mark'};
  if(typeof v==='number'&&v>20000&&v<80000)return{k:'date',date:xDate(v),rest:''};
  if(v instanceof Date)return{k:'date',date:xDate(v),rest:''};
  const s=clean(v);if(!s)return{k:'empty'};
  if(/^(true|false|waar|onwaar|x|v|ja|nee|✓)$/i.test(s))return{k:'mark'};
  let m=/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4}|\d{2})\b/.exec(s);
  if(m){const y=m[3].length===2?'20'+m[3]:m[3];return{k:'date',date:`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`,rest:(s.slice(0,m.index)+' '+s.slice(m.index+m[0].length)).replace(/^\s*(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i,'').trim()}}
  m=/^(\d{1,2})-(\d{1,2})\s+([A-Za-z].*)$/.exec(s);
  if(m&&!/annul|op\s/i.test(s)&&+m[2]<=12)return{k:'date',noYear:true,dm:[+m[1],+m[2]],rest:m[3]};
  if(/^niet\s+beschikbaar/i.test(s))return{k:'nb',v:s};
  if(/\d{1,2}[:.]\d{2}/.test(s)&&s.length<=60){const t=xTime(s);if(t.from)return{k:'time',win:/tussen/i.test(s),from:t.from,to:t.to||'',rest:s.replace(/(tussen\s*)?\d{1,2}[:.]\d{2}(\s*(tot|en|-|t\/m)\s*\d{1,2}[:.]\d{2})?/i,'').replace(/^[\s(\/]+|[\s)]+$/g,'').trim()}}
  return{k:'text',v:s};
}
function restInfo(appt,rest){
  if(!rest)return;const r=rest.replace(/^[\s(\/]+|[\s)]+$/g,'').trim();if(!r)return;
  const t=/\d{1,2}[:.]\d{2}/.test(r)?xTime(r):{};if(t.from&&!appt.from){appt.from=t.from;appt.to=t.to||''}
  const txt=r.replace(/(tussen\s*)?\d{1,2}[:.]\d{2}(\s*(tot|en|-)\s*\d{1,2}[:.]\d{2})?/i,'').replace(/^[\s(\/]+|[\s)]+$/g,'').trim();
  if(/annul/i.test(txt))appt.cancel=txt;else if(txt)appt.notes.push(txt);
}
function parseBlocks(rows,opts={}){
  const names=opts.names||{},items=[],skipped=[],stat={nb:0,cancel:0,reasons:{}},badCity={},log=[],lookups=new Map(),blocks=[];
  let blk=null,group='',pendingTitle=[];
  const isHeader=r=>r&&/kenteken/i.test(clean(r[0]));
  for(let r=0;r<rows.length;r++){
    const row=rows[r]||[];if(!row.some(v=>clean(v)))continue;
    if(isHeader(row)){
      const top=pendingTitle.length?pendingTitle:[],meta=sheetMeta(top.map(x=>x.row)),tcell=top.length?clean(top[0].row[0]):'';
      const bi=blocks.length,auto=custFromTitle(tcell,meta.login)||`Klant (rij ${r})`;
      const H=row.map(c=>clean(c).toLowerCase());const find=re=>H.findIndex((h,i)=>i>0&&re.test(h));
      blk={i:bi,row:r+1,title:tcell,autoName:auto,cust:clean(names[bi]!=null?names[bi]:auto)||auto,meta,city:cityFromText(tcell),
        addrIdx:find(/adres|locatie|straat/),cityIdx:find(/plaats|stad/),vehIdx:find(/voertuig|merk|model|type auto/),plates:0,ok:0,future:0,lookups:0};
      if(blk.addrIdx<0&&blk.cityIdx>=0){blk.addrIdx=blk.cityIdx;blk.cityIdx=-1}
      if(blk.addrIdx<0)blk.addrIdx=1;
      blocks.push(blk);pendingTitle=[];group='';continue;
    }
    const c0=clean(row[0]);
    if(!isPlate(c0)){
      // titel van het volgende blok, of een groepsregel zoals "Samen met Athlon Leeuwarden"
      const next=rows.slice(r+1).find(x=>x&&x.some(v=>clean(v)));
      if(/^overzicht/i.test(c0)||isHeader(next)){pendingTitle.push({row,r});blk=blk&&isHeader(next)?blk:blk;continue}
      if(blk){const t=row.map(clean).filter(Boolean).filter(v=>!/\d{1,2}[:.]\d{2}/.test(v)).join(' ');group=/samen met\s*$/i.test(t)?'':t}
      continue;
    }
    if(!blk){skipped.push(`Rij ${r+1}: voertuig zonder kolomnamen erboven`);continue}
    const plate=c0.toUpperCase().replace(/\s/g,''),cust=blk.cust;blk.plates++;
    const cityCell=blk.cityIdx>=0?clean(row[blk.cityIdx]):'',cityOk=cityCell&&!/\d/.test(cityCell)&&!MONTHS_RE.test(cityCell+',')&&!/route|samen|bij\s/i.test(cityCell)&&cityCell.length<=40;
    const used=new Set([0,blk.addrIdx,blk.vehIdx,cityOk?blk.cityIdx:-1]);
    let{addr,city,pc}=parseAddrCell(row[blk.addrIdx],cityOk?cityCell:'',blk.city);
    let exact=null;
    if(!pc&&addr&&city&&/\d/.test(addr)){const k=geoKey(addr,city),g=XGEO[k];if(g&&g.ok){pc=g.postcode;exact=g;if(g.city)city=g.city}else if(!g){lookups.set(k,{key:k,addr,city,q:pdokAddr(addr)+' '+city});blk.lookups++}}
    else if(!pc&&addr&&city&&!cityFromText(addr)){const k=geoKey(addr,city),g=XGEO[k];if(g&&g.ok){pc=g.postcode;exact=g;if(g.city)city=g.city}else if(!g){lookups.set(k,{key:k,addr,city,q:addr+' '+city});blk.lookups++}}
    const veh=blk.vehIdx>=0?clean(row[blk.vehIdx]):'';
    if(!exact&&!geocode(pc,city)){const k=city||addr||'(leeg)';badCity[k]=(badCity[k]||0)+1;skipped.push(`Rij ${r+1}: locatie "${k}" niet gevonden`);log.push({row:r+1,plate,cust,city:city||'',addr,pc,veh,per:'',date:'',time:'',note:'',status:'city',reason:`Locatie "${addr||''}${city?', '+city:''}" niet gevonden; vul plaats of postcode aan`});continue}
    // cellen na kenteken/adres: datums met hun tijd en opmerkingen
    const appts=[],rowNotes=[];let cur=null,gap=0,lastDate='',prevNb=false,times=0,timeAfterLast=null;
    const last=row.length;
    for(let i=1;i<last;i++){
      if(used.has(i))continue;
      const t=xToken(row[i]);
      if(t.k==='empty'){gap++;continue}
      if(t.k==='mark'){continue}
      if(t.k==='date'){
        let date=t.date;if(t.noYear){const y=(lastDate||todayIso()).slice(0,4);date=`${y}-${String(t.dm[1]).padStart(2,'0')}-${String(t.dm[0]).padStart(2,'0')}`}
        if(!date)continue;cur={date,from:'',to:'',notes:[],col:i};restInfo(cur,t.rest);appts.push(cur);lastDate=date;gap=0;prevNb=false;timeAfterLast=null;continue}
      if(t.k==='time'){times++;
        if(cur&&!cur.from&&gap<=1){cur.from=t.from;cur.to=t.to;cur.win=t.win;restInfo(cur,t.rest)}
        else if(cur&&cur.from&&gap===0&&t.rest&&/annul/i.test(t.rest))cur.cancel=t.rest;
        if(cur&&appts.length>1&&cur===appts[appts.length-1])timeAfterLast=timeAfterLast?'multi':t;
        gap=0;continue}
      if(t.k==='nb'){if(cur&&!cur.from&&gap===0&&!cur.nb)cur.nb=t.v;else if(!prevNb){stat.nb++;stat.reasons['Niet beschikbaar']=(stat.reasons['Niet beschikbaar']||0)+1;log.push({row:r+1,plate,cust,city,addr,pc,veh,per:'',date:'',time:'',note:'',status:'nb',reason:'Niet beschikbaar (zonder datum)'})}prevNb=true;gap=0;continue}
      prevNb=false;
      if(cur&&gap===0){if(/annul/i.test(t.v))cur.cancel=t.v;else cur.notes.push(t.v)}else rowNotes.push(t.v);
      gap=0;
    }
    // één tijd achter een reeks datums zonder eigen tijd: geldt voor al die datums
    const noTime=appts.filter(a=>!a.from&&!a.nb&&!a.cancel);
    if(timeAfterLast&&timeAfterLast!=='multi'&&noTime.length>0&&appts.length>1&&times===1)noTime.forEach(a=>{a.from=timeAfterLast.from;a.to=timeAfterLast.to});
    const extra=[group,...rowNotes].filter(Boolean);
    const base={plate,cust,addr,pc,city,veh,mail:'',login:blk.meta.login,phone:blk.meta.phone,info:blk.meta.info.filter(x=>!/^datum/i.test(x)).join(' · '),...(exact?{lat:exact.lat,lng:exact.lng,geoLabel:exact.label}:{})};
    for(const a of appts){
      const note=[...a.notes,...extra].join(' · '),per=fdate(a.date,{month:'short',year:'numeric'}),time=a.from?a.from+(a.to?'–'+a.to:''):'';
      const L=(status,reason)=>log.push({row:r+1,plate,cust,city,addr,pc,veh,from:a.from,to:a.to,win:!!a.win,per,date:a.date,time,note,status,reason});
      if(a.cancel){stat.cancel++;L('cancel','Geannuleerd: '+a.cancel);continue}
      if(a.nb){stat.nb++;stat.reasons[a.nb]=(stat.reasons[a.nb]||0)+1;L('nb',a.nb);continue}
      items.push({...base,date:a.date,from:a.from,to:a.to,win:!!a.win,note,li:log.length});L('ok','');blk.ok++;if(a.date>=todayIso())blk.future++;
    }
    if(!appts.length)log.push({row:r+1,plate,cust,city,addr,pc,veh,per:'',date:'',time:'',note:extra.join(' · '),status:'nb',reason:'Geen datum in de lijst'});
  }
  if(!blocks.length)return{error:'Geen rij met "Kenteken" gevonden.'};
  return{items,skipped,stat,badCity,log,lookups:[...lookups.values()],blocks,multi:true};
}

/* ---------- Importlog als eigen pagina: filteren en vanuit de log alsnog afspraken maken ---------- */
let LOGSEL=new Set();
function importLogs(){
  if(!D.importLogs){D.importLogs=D.importLog?[{id:uid('il'),...D.importLog}]:[]}
  return D.importLogs;
}
function curLog(){const L=importLogs();return L.find(x=>x.id===S.logId)||L[L.length-1]||null}
const nextWorkday=d=>{let x=addDays(d,1);while([0,6].includes(wday(x)))x=addDays(x,1);return x};
function viewImportLog(){
  const L=importLogs(),lg=curLog();
  if(!lg){LOGSRC=null;return`<section class="panel empty"><h2>Nog geen import</h2><p>Na het importeren van een Excel-lijst zie je hier per voertuig wat er met elke afspraak is gebeurd, en kun je afspraken alsnog inplannen.</p><button class="btn primary" data-act="ximport">${I.imp} Excel importeren</button></section>`}
  if(!LOGSRC||LOGSRC.id!==lg.id||LOGSRC.preview){LOGSRC={entries:lg.entries,preview:false,id:lg.id};LOGSEL=new Set()}
  const custs=[...new Set(lg.entries.map(e=>e.cust))].sort();
  return`<section class="panel sec"><div class="toolbar"><h2>Importlog</h2>
    <select class="mini" data-act="logpick" id="logPick" aria-label="Kies import">${L.slice().reverse().map(x=>`<option value="${x.id}"${x.id===lg.id?' selected':''}>${esc(x.file)} · ${esc(new Date(x.at).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</option>`).join('')}</select>
    <span class="sp"></span><button class="btn sm" data-act="logcsv">${I.copy} Kopieer als CSV</button><button class="btn sm" data-act="logdel" title="Deze log verwijderen (de opdrachten blijven staan)">${I.trash} Log verwijderen</button><button class="btn sm primary" data-act="ximport">${I.imp} Nieuwe import</button></div>
    <p class="hint" style="margin:0">De status is actueel: wat je in de planning wijzigt, zie je hier direct terug. Bij een afspraak die niet doorging kun je hem <b>alsnog inplannen</b> op een andere datum, of het adres aanvullen als de plaats onbekend was.</p>
    ${logShell(custs)}</section>`;
}
function logEntry(i){const lg=curLog();return lg&&lg.entries[+i]}
function findLoc(cu,addr,pc,city){
  const npc=String(pc||'').replace(/\s/g,'').toUpperCase(),na=clean(addr).toLowerCase(),nc=clean(city).toLowerCase();
  return D.locations.find(l=>l.customerId===cu.id&&(npc?String(l.postcode||'').replace(/\s/g,'').toUpperCase()===npc&&(!na||!l.address||clean(l.address).toLowerCase()===na):clean(l.address).toLowerCase()===na&&clean(l.city).toLowerCase()===nc));
}
function logMakeJob(e,v){
  const bill=e.billTo&&D.customers.find(c=>c.id===e.billTo);
  let cu=D.customers.find(x=>x!==bill&&clean(x.name).toLowerCase()===clean(v.cust).toLowerCase());
  if(!cu){cu={id:uid('c'),name:clean(v.cust),contact:'',phone:'',email:'',login:''};D.customers.push(cu)}
  if(bill)cu.billTo=bill.id;
  let lo=findLoc(cu,v.addr,v.pc,v.city),isNew=false;
  if(!lo){const g=geocode(v.pc,v.city);if(!g)return{err:'Plaats of postcode niet gevonden. Vul een postcode (1234 AB) of een bekende plaats in.'};
    lo={id:uid('l'),customerId:cu.id,name:v.addr||'Locatie',address:v.addr||'',postcode:String(v.pc||'').toUpperCase(),city:v.city||'',info:'',...g};D.locations.push(lo);isNew=true}
  const j={id:uid('j'),plate:normPlate(v.plate)?v.plate.toUpperCase():v.plate,vehicle:v.veh||'',locationId:lo.id,date:v.date,from:v.from||'',to:v.to||'',type:v.type||D.types[0].id,duration:+v.duration||'',priority:2,notes:v.note||''};
  D.jobs.push(j);
  e.orig=e.orig||{status:e.status,reason:e.reason,date:e.date};e.status='imp';e.jobId=j.id;e.date=v.date;e.time=v.from?v.from+(v.to?'–'+v.to:''):'';e.fixed=Date.now();e.done=false;
  e.addr=lo.address;e.pc=lo.postcode;e.city=lo.city;
  return{job:j,lo,isNew};
}
function openLogFix(i){
  const e=logEntry(i);if(!e)return;const today=todayIso();
  const lenM=e.from&&e.to?t2m(e.to)-t2m(e.from):0;
  const vals={cust:e.cust,plate:e.plate,veh:e.veh||'',addr:e.addr||'',pc:e.pc||'',city:e.city||'',
    date:e.date&&e.date>=today?e.date:nextWorkday(today),from:e.from||'',to:e.to||'',duration:lenM>0&&!e.win?lenM:'',type:D.types[0].id,note:e.note||''};
  const cityProb=e.status==='city';
  openForm({title:cityProb?'Adres aanvullen en inplannen':'Afspraak alsnog inplannen',okLabel:'Afspraak aanmaken',
    note:`${e.plate} · ${e.cust} · ${(LOGST[e.status]||[e.status])[0]}${e.reason?': '+e.reason:''}${e.date?' (oorspronkelijk '+fdate(e.date,{day:'numeric',month:'short',year:'numeric'})+')':''}`,
    fields:[{k:'h1',type:'heading',label:'Voertuig en klant'},{k:'plate',label:'Kenteken',req:1},{k:'veh',label:'Voertuig'},{k:'cust',label:'Klant',req:1,wide:1},
      {k:'h2',type:'heading',label:cityProb?'Locatie (aanvullen: postcode of juiste plaats)':'Locatie'},{k:'addr',label:'Adres',wide:1},{k:'pc',label:'Postcode',ph:'1234 AB'},{k:'city',label:'Plaats'},
      {k:'h3',type:'heading',label:'Afspraak'},{k:'date',label:'Datum',type:'date',req:1},{k:'type',label:'Type reiniging',type:'select',options:D.types.map(t=>[t.id,`${t.name} (${t.dur} min)`])},
      {k:'from',label:'Tijdvak vanaf',type:'time'},{k:'to',label:'Tijdvak tot',type:'time'},{k:'duration',label:'Duur (min, leeg = standaard type)',type:'number'},{k:'note',label:'Opmerking',wide:1}],
    values:vals,
    onSave:v=>{
      if(v.date<today)return'Kies een datum vanaf vandaag.';
      if(v.from&&v.to&&t2m(v.to)<=t2m(v.from))return'"Tot" moet na "vanaf" liggen.';
      if(!v.pc&&!v.city)return'Vul een postcode of plaats in.';
      if(D.jobs.some(j=>j.plate===v.plate.toUpperCase()&&j.date===v.date))return`${v.plate} staat op ${fdate(v.date,{day:'numeric',month:'short'})} al ingepland.`;
      const r=logMakeJob(e,{...v,plate:v.plate.toUpperCase()});if(r.err)return r.err;
      index();replan([v.date]);if(r.isNew)pdokAfterSave(r.lo);
      toast(`${v.plate.toUpperCase()} ingepland op ${fdate(v.date,{weekday:'short',day:'numeric',month:'short'})}${(()=>{const le=liveEntries({entries:[e]})[0];return le.st==='planned'?' bij '+le.reason:le.st==='unplanned'?', maar past nog niet: zie de log':''})()}.`);
      render();return'';
    }});
}
function openLogMove(i){
  const e=logEntry(i),j=e&&JOB[e.jobId];if(!j)return;const old=j.date;
  openForm({title:'Andere datum of tijd',okLabel:'Verplaatsen',note:`${j.plate} · ${e.cust} · nu ${fdate(old,{weekday:'short',day:'numeric',month:'short'})}`,
    fields:[{k:'date',label:'Datum',type:'date',req:1},{k:'from',label:'Tijdvak vanaf',type:'time'},{k:'to',label:'Tijdvak tot',type:'time'}],values:{date:old,from:j.from,to:j.to},
    onSave:v=>{if(v.date<todayIso())return'Kies een datum vanaf vandaag.';if(v.from&&v.to&&t2m(v.to)<=t2m(v.from))return'"Tot" moet na "vanaf" liggen.';
      j.date=v.date;j.from=v.from;j.to=v.to;e.date=v.date;e.time=v.from?v.from+(v.to?'–'+v.to:''):'';index();replan([...new Set([old,v.date])]);render();
      const le=liveEntries({entries:[e]})[0];toast(le.st==='planned'?`Verplaatst en ingepland: ${le.reason}.`:'Verplaatst, maar past nog niet. Probeer Voorstel.');return''}});
}
function openLogBulk(){
  const ids=[...LOGSEL].map(i=>[i,logEntry(i)]).filter(([,e])=>e&&!(e.status==='imp'&&JOB[e.jobId]));
  if(!ids.length){toast('Selecteer regels die (nog) geen afspraak hebben.');return}
  openForm({title:`${ids.length} afspraken alsnog inplannen`,okLabel:'Inplannen',note:'Elke geselecteerde auto krijgt een afspraak op de gekozen datum, op hetzelfde adres. Regels met een onbekende plaats worden overgeslagen: vul die eerst per regel aan.',
    fields:[{k:'date',label:'Datum',type:'date',req:1},{k:'type',label:'Type reiniging',type:'select',options:D.types.map(t=>[t.id,`${t.name} (${t.dur} min)`])},
      {k:'keep',label:'Tijdvak',type:'select',options:[['1','Oorspronkelijk tijdvak aanhouden'],['0','Geen tijdvak (hele dag)']]}],values:{date:nextWorkday(todayIso()),type:D.types[0].id,keep:'1'},
    onSave:v=>{if(v.date<todayIso())return'Kies een datum vanaf vandaag.';let n=0,skip=0;
      for(const[,e]of ids){if(e.status==='city'||(!e.pc&&!e.city)||D.jobs.some(j=>j.plate===e.plate&&j.date===v.date)){skip++;continue}
        const lenM=e.from&&e.to?t2m(e.to)-t2m(e.from):0;
        const r=logMakeJob(e,{cust:e.cust,plate:e.plate,veh:e.veh,addr:e.addr,pc:e.pc,city:e.city,date:v.date,from:v.keep==='1'?e.from:'',to:v.keep==='1'?e.to:'',duration:v.keep==='1'&&lenM>0&&!e.win?lenM:'',type:v.type,note:e.note});
        if(r.err)skip++;else n++}
      LOGSEL=new Set();index();replan([v.date]);render();toast(`${n} afspraken ingepland op ${fdate(v.date,{weekday:'short',day:'numeric',month:'short'})}${skip?`, ${skip} overgeslagen`:''}.`);return''}});
}
function logGoto(i){
  const e=logEntry(i),j=e&&JOB[e.jobId];if(!j)return;S.date=j.date;S.tab='planning';
  const P=D.plans[j.date];let wid=null;if(P&&P.routes)for(const k in P.routes)if(P.routes[k].includes(j.id))wid=k;
  render();window.scrollTo(0,0);if(wid){S.wid=wid;S.selLoc=j.locationId;render();openVisit(wid,j.locationId)}else toast(`${j.plate} staat nog bij Niet ingepland op deze dag.`);
}

/* ---------- Business Central: wat er naar BC gaat voor facturatie (voorbereiding koppeling) ---------- */
const BCFAIL=[['none','Niet sturen'],['nobill','Sturen, niet factureren'],['callout','Sturen als voorrijkosten']];
const custOfJob=j=>CUS[(LOC[j.locationId]||{}).customerId]||{};
/* Factuurklant: de leasemaatschappij als die bij de klant is ingesteld, anders de klant zelf */
const billOf=c=>(c&&c.billTo&&CUS[c.billTo])||c||{};
const bcFailMode=c=>c.bcFail||'nobill';
function bcDecide(j,s){
  const c=billOf(custOfJob(j)),ov=(D.bcOverride||{})[j.id];
  let send,billable,why='';
  if(s.st==='done'){send=true;billable=!/niet\s+factureren/i.test(j.notes||'');if(!billable)why='Opmerking "niet factureren" in de opdracht'}
  else{const m=bcFailMode(c);send=m!=='none';billable=m==='callout';why=m==='none'?'Klant: niet gelukt niet sturen':m==='callout'?'Klant: voorrijkosten':'Klant: sturen, niet factureren'}
  if(ov===true||ov===false){if(ov!==send)why='Handmatig door planner';send=ov}
  return{send,billable:send&&billable,why,override:ov===true||ov===false};
}
function bcRow(j,s){
  const l=LOC[j.locationId]||{},ec=custOfJob(j),c=billOf(ec),t=TYP[j.type]||{},w=WRK[s.wid]||{};const d=bcDecide(j,s);
  const at=s.at?new Date(s.at):null;
  return{j,s,c,ec,l,t,w,d,
    api:{externalId:j.id,customerNo:c.bcNo||'',shipToCode:l.bcShipTo||'',licensePlate:j.plate,cleaningDate:j.date,cleaningTime:at?at.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}):'',
      itemNo:s.st==='done'?(t.bcItem||''):(bcFailMode(c)==='callout'&&!d.override?(D.settings.bcCalloutItem||'VOORRIJKOSTEN'):(t.bcItem||'')),resourceNo:w.bcResource||'',durationMinutes:s.st==='done'?jobDur(j):0,locationName:ec!==c?ec.name||'':l.name||'',locationAddress:[l.address,l.postcode].filter(Boolean).join(', '),locationCity:l.city||'',
      status:s.st==='done'?'Gereed':'NietGereinigd',billable:d.billable,reason:s.st==='issue'?(s.reason||''):'',note:s.note||''},
    missing:[!c.bcNo&&'debiteurnr.',!t.bcItem&&s.st==='done'&&'artikelnr.'].filter(Boolean)};
}
let BCST={month:'',data:{},loading:false,err:'',demo:false};
function bcMonths(){const ms=[...new Set(D.jobs.map(j=>j.date.slice(0,7)))].sort();const cur=todayIso().slice(0,7);if(!ms.includes(cur))ms.push(cur);return ms.sort()}
function demoStatuses(month){
  const out={},today=todayIso(),R=['Auto niet aanwezig','Geen toegang tot de locatie'];
  for(const d of Object.keys(D.plans).filter(d=>d.slice(0,7)===month&&d<=today)){const P=D.plans[d];out[d]={};
    for(const wid in P.routes||{})for(const id of P.routes[wid]){if(!JOB[id])continue;let h=2166136261;for(const ch of id+d){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}h%=100;
      if(h<84)out[d][id]={st:'done',at:`${d}T${String(8+h%8).padStart(2,'0')}:${String((h*7)%60).padStart(2,'0')}:00`,wid};else if(h<94)out[d][id]={st:'issue',reason:R[h%2],note:'',at:`${d}T10:15:00`,wid}}}
  return out;
}
async function bcLoad(month){
  BCST.month=month;BCST.err='';
  if(!SERVER){BCST.data=demoStatuses(month);BCST.demo=true;return}
  BCST.loading=true;render();
  try{const d=await withPw(()=>api(`/api/status?from=${month}-01&to=${month}-31`));BCST.data=d.byDate||{};BCST.demo=false}
  catch(e){BCST.err=apiErr(e)}
  BCST.loading=false;if(S.tab==='facturatie')render();
}
function bcRows(){
  const rows=[];for(const d in BCST.data)for(const id in BCST.data[d]){const j=JOB[id],s=BCST.data[d][id];if(!j||!s||!(s.st==='done'||s.st==='issue'))continue;
    const P=D.plans[d];let wid=s.wid;if(!wid&&P)for(const k in P.routes||{})if(P.routes[k].includes(id))wid=k;rows.push(bcRow(j,{...s,wid}))}
  // "Niet beschikbaar" uit de Excel, alleen voor klanten die dat willen
  for(const lg of (D.importLogs||[]))for(const e of lg.entries){if(e.status!=='nb'||!e.date||e.date.slice(0,7)!==BCST.month)continue;
    const ec=D.customers.find(x=>clean(x.name).toLowerCase()===clean(e.cust).toLowerCase()),c=billOf(ec);if(!ec||c.bcNb!=='1')continue;
    rows.push({nb:true,e,c,ec,l:{},t:{},w:{},d:{send:true,billable:false,why:'Klant: niet beschikbaar ook sturen'},j:{id:'nb-'+lg.id+'-'+e.row+'-'+e.date,plate:e.plate,date:e.date},s:{st:'nb'},
      api:{externalId:'nb-'+lg.id+'-'+e.row+'-'+e.date,customerNo:c.bcNo||'',shipToCode:'',licensePlate:e.plate,cleaningDate:e.date,cleaningTime:'',itemNo:'',resourceNo:'',status:'NietBeschikbaar',billable:false,reason:e.reason||'Niet beschikbaar',note:'',locationName:ec!==c?ec.name:'',locationAddress:e.addr||'',locationCity:e.city||''},missing:[!c.bcNo&&'debiteurnr.'].filter(Boolean)})}
  return rows.sort((a,b)=>a.j.date.localeCompare(b.j.date)||String(a.api.cleaningTime).localeCompare(String(b.api.cleaningTime)));
}
function viewBC(){
  const ms=bcMonths();if(!BCST.month||!ms.includes(BCST.month)){BCST.month=todayIso().slice(0,7);setTimeout(()=>bcLoad(BCST.month).then(()=>render()),0)}
  const all=bcRows(),f=S.bcf||(S.bcf={c:'',k:''});
  const rows=all.filter(r=>(!f.c||r.c.id===f.c)&&(!f.k||(f.k==='send'?r.d.send:f.k==='skip'?!r.d.send:f.k==='bill'?r.d.billable:f.k==='miss'?r.missing.length&&r.d.send:true)));
  const sent=all.filter(r=>r.d.send),miss=sent.filter(r=>r.missing.length);
  const byC={};all.forEach(r=>{const k=r.c.id||'?';const o=byC[k]=byC[k]||{c:r.c,done:0,fail:0,failSent:0,bill:0,nb:0};if(r.s.st==='done')o.done++;else if(r.nb)o.nb++;else{o.fail++;if(r.d.send)o.failSent++}if(r.d.billable)o.bill++});
  const missC=[...new Set(miss.filter(r=>!r.c.bcNo).map(r=>r.c.id))].map(id=>CUS[id]).filter(Boolean),missT=[...new Set(miss.filter(r=>!r.t.bcItem&&r.s.st==='done').map(r=>r.j.type))].map(id=>TYP[id]).filter(Boolean);
  const st=r=>r.nb?'<span class="chip">Niet beschikbaar</span>':r.s.st==='done'?`<span class="chip ok">${I.check} Gereed</span>`:`<span class="chip bad">Niet gelukt</span>`;
  const tr=rows.map(r=>`<tr${r.d.send?'':' class="muted-row"'}><td class="mono small">${esc(fdate(r.j.date,{weekday:'short',day:'numeric',month:'short'}))}<div class="muted">${esc(r.api.cleaningTime)}</div></td><td>${plateHtml(r.j.plate)}</td>
    <td><b>${esc(r.ec&&r.ec!==r.c?r.ec.name:r.c.name||'?')}</b>${r.ec&&r.ec!==r.c?`<div class="small muted">factuur aan ${esc(r.c.name)}</div>`:''}<div class="small ${r.c.bcNo?'muted':''}" ${r.c.bcNo?'':'style="color:var(--bad)"'}>${r.c.bcNo?'Deb. '+esc(r.c.bcNo):'geen debiteurnr.'}</div></td>
    <td class="small">${esc(r.l.city||r.e&&r.e.city||'')}${r.l.bcShipTo?`<div class="muted">Verz. ${esc(r.l.bcShipTo)}</div>`:''}</td>
    <td class="small">${esc(r.t.name||'')}${r.api.durationMinutes?` <span class="muted">· ${r.api.durationMinutes} min</span>`:''}${r.api.itemNo?`<div class="muted">Art. ${esc(r.api.itemNo)}</div>`:r.s.st==='done'?'<div style="color:var(--bad)">geen artikelnr.</div>':''}</td>
    <td class="small">${esc(r.w.name||'')}</td><td>${st(r)}${r.api.reason?`<div class="small muted">${esc(r.api.reason)}</div>`:''}</td>
    <td>${r.d.send?(r.d.billable?'<span class="chip ok">Ja</span>':'<span class="chip">Nee</span>'):'<span class="muted">—</span>'}</td>
    <td>${r.nb?'<span class="small muted">via klant</span>':`<button class="btn sm${r.d.send?' on':''}" data-act="bctoggle" data-id="${r.j.id}" aria-pressed="${r.d.send}" title="${esc(r.d.why||'')}">${r.d.send?'Naar BC: ja':'Naar BC: nee'}</button>`}${r.d.override?`<div class="small muted">handmatig · <button class="linkbtn" data-act="bcreset" data-id="${r.j.id}">standaard</button></div>`:r.d.why?`<div class="small muted">${esc(r.d.why)}</div>`:''}</td><td>${bcInBC(r)}</td></tr>`).join('');
  const sum=Object.values(byC).sort((a,b)=>String(a.c.name).localeCompare(String(b.c.name),'nl')).map(o=>`<tr><td><b>${esc(o.c.name||'?')}</b>${o.c.bcNo?` <span class="muted small">${esc(o.c.bcNo)}</span>`:''}</td><td class="mono">${o.done}</td><td class="mono">${o.fail}${o.fail?` <span class="small muted">(${o.failSent} naar BC)</span>`:''}</td><td class="mono">${o.nb||''}</td><td class="mono"><b>${o.bill}</b></td><td class="small">${BCFAIL.find(x=>x[0]===bcFailMode(o.c))[1]}</td><td class="act"><button class="btn ghost" data-act="editcus" data-id="${o.c.id||''}" aria-label="Instellingen klant">${I.edit}</button></td></tr>`).join('');
  const sel=(k,opts)=>`<select class="mini" data-bcf="${k}">${opts.map(([v,l])=>`<option value="${esc(v)}"${f[k]===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  return`<section class="panel sec"><div class="toolbar"><h2>Business Central interface</h2>
    <select class="mini" data-bcmonth aria-label="Maand">${ms.map(m=>`<option value="${m}"${m===BCST.month?' selected':''}>${esc(fdate(m+'-01',{month:'long',year:'numeric'}))}</option>`).join('')}</select>
    <span class="sp"></span><button class="btn sm" data-act="bcref">Ververs</button>${SERVER&&!BCST.demo?`<button class="btn sm primary" data-act="bcsend"${BCST.loading||BCST.sending?' disabled':''}>${BCST.sending?'Versturen\u2026':'Verstuur naar BC'}</button>`:''}</div>
    ${bcSyncLine()}
    <p class="hint" style="margin:0">${SERVER?'Met <b>Verstuur naar BC</b> gaan de regels van deze maand naar Business Central. Opnieuw versturen is veilig: alleen nieuwe en gewijzigde regels gaan mee, en wat je hier op "Naar BC: nee" zet, krijgt in BC de status Vervallen.':'De koppeling met Business Central werkt in de Netlify-versie.'} Dit overzicht laat zien wat er per maand naar BC gaat: gereedmeldingen als factureerbare regel, en meldingen "niet gelukt" volgens de instelling per klant. Met de knop <b>Naar BC</b> wijk je per melding af van die instelling.</p>
    ${BCST.demo?'<p class="small" style="margin:0;color:var(--warn)">Voorbeeldgegevens: hier zijn geen echte meldingen beschikbaar. In de Netlify-versie zie je de meldingen van je medewerkers.</p>':''}
    ${BCST.err?`<p class="small" style="margin:0;color:var(--bad)">${esc(BCST.err)}</p>`:''}${BCST.loading?'<p class="hint" style="margin:0">Meldingen ophalen…</p>':''}
    ${missC.length||missT.length?`<div class="bcwarn"><b>Nog niet compleet voor BC:</b> ${missC.length?`${missC.length} klant(en) zonder debiteurnummer (${missC.slice(0,4).map(c=>`<button class="linkbtn" data-act="editcus" data-id="${c.id}">${esc(c.name)}</button>`).join(', ')})`:''}${missC.length&&missT.length?' · ':''}${missT.length?`${missT.length} type(s) zonder artikelnummer (${missT.map(t=>`<button class="linkbtn" data-act="edittype" data-id="${t.id}">${esc(t.name)}</button>`).join(', ')})`:''}</div>`:''}
    ${sum?`<div class="tbl-wrap"><table><thead><tr><th>Klant</th><th>Gereed</th><th>Niet gelukt</th><th>Niet beschikbaar</th><th>Factureerbaar</th><th>Niet gelukt naar BC</th><th></th></tr></thead><tbody>${sum}</tbody></table></div>`:''}</section>
  <section class="panel sec"><div class="toolbar"><h2>Regels</h2><span class="small muted">${sent.length} naar BC · ${all.length-sent.length} niet</span><span class="sp"></span>${sel('c',[['','Alle klanten'],...Object.values(byC).map(o=>[o.c.id||'',o.c.name||'?'])])}${sel('k',[['','Alle regels'],['send','Naar BC'],['skip','Niet naar BC'],['bill','Factureerbaar'],['miss','Koppeling ontbreekt']])}</div>
    ${tr?`<div class="tbl-wrap" style="max-height:62vh;overflow:auto"><table><thead><tr><th>Datum</th><th>Kenteken</th><th>Klant</th><th>Locatie</th><th>Type</th><th>Medewerker</th><th>Melding</th><th>Factureerbaar</th><th>Naar BC</th><th>In BC</th></tr></thead><tbody>${tr}</tbody></table></div>`:`<p class="empty">${all.length?'Geen regels in deze selectie.':'Nog geen gereed- of niet-gelukt-meldingen in deze maand.'}</p>`}</section>`;
}
function bcSync(){return((D.bcSync||{})[BCST.month])||null}
function bcInBC(r){const x=bcSync();if(!x)return'<span class="muted small">—</span>';const b=(x.bc||{})[r.api.externalId],e=(x.errors||[]).find(q=>q.externalId===r.api.externalId);
  if(e)return`<span class="chip bad" title="${esc(e.message)}">Fout</span><div class="small" style="color:var(--bad);max-width:24ch">${esc(e.message)}</div>`;
  if(!b)return r.d.send?'<span class="chip warn">Nog niet</span>':'<span class="muted small">—</span>';
  if(b.status==='Vervallen')return'<span class="chip">Vervallen</span>';
  return b.invoiceStatus==='Gefactureerd'?`<span class="chip ok">Gefactureerd</span><div class="small muted">${esc(b.invoiceNo)}</div>`:b.invoiceStatus==='OpFactuur'?`<span class="chip acc">Op factuur</span><div class="small muted">${esc(b.invoiceNo)}</div>`:'<span class="chip">In BC, open</span>'}
function bcSyncLine(){const x=bcSync();if(!x||x.created===undefined)return'';const t=new Date(x.at).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return`<div class="bcsync"><b>Laatst verstuurd ${esc(t)}:</b> ${x.created||0} nieuw, ${x.updated||0} bijgewerkt, ${x.voided||0} vervallen, ${x.unchanged||0} ongewijzigd${(x.errors||[]).length?` · <span style="color:var(--bad)">${x.errors.length} niet gelukt</span>`:''}</div>`}
async function bcSend(confirm){
  if(BCST.demo||!SERVER)return;const all=bcRows(),rows=all.filter(r=>r.d.send&&r.api.customerNo).map(r=>r.api),skip=all.filter(r=>r.d.send&&!r.api.customerNo).length;
  BCST.sending=true;render();
  try{const d=await withPw(()=>api('/api/bc-sync'+(confirm?'?confirm=1':''),{method:'POST',body:JSON.stringify({month:BCST.month,rows})}));
    D.bcSync=D.bcSync||{};D.bcSync[BCST.month]={...d,at:Date.now()};save();
    toast(`Naar BC: ${d.created} nieuw, ${d.updated} bijgewerkt, ${d.voided} vervallen.${d.errors.length?` ${d.errors.length} niet gelukt, zie de kolom In BC.`:''}${skip?` ${skip} overgeslagen zonder debiteurnummer.`:''}`)}
  catch(e){if(e&&e.code==='srv'&&/bevestig/.test(e.message||'')){BCST.sending=false;bcConfirm(e.message);return}toast(apiErr(e))}
  BCST.sending=false;render();
}
function bcConfirm(msg){FORM=null;$('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="bcT" style="width:min(520px,100%)"><h3 id="bcT">Veel regels op Vervallen</h3><p>${esc(msg)}</p><div class="dlg-foot"><button class="btn" data-act="dlgx">Annuleren</button><span class="sp"></span><button class="btn danger" data-act="bcsendok">Toch versturen</button></div></div>`;$('#modal').hidden=false}
async function bcTest(){
  try{const d=await withPw(()=>api('/api/bc-sync?test=1'));FORM=null;D.apiTest={...(D.apiTest||{}),bc:{ok:!!d.chosen,at:Date.now(),env:d.environment,company:((d.companies||[]).find(c=>c.id===d.chosen)||{}).name||'',error:d.chosen?'':'Geen bedrijf gekozen: zet BC_COMPANY_NAME in Netlify'}};save();if(S.tab==='instellingen')render();
    $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="btT" style="width:min(560px,100%)"><h3 id="btT">Koppeling met Business Central werkt</h3>
      <p>Ingelogd in omgeving <b>${esc(d.environment)}</b>. Bedrijven in deze omgeving:</p>
      <ul>${d.companies.map(c=>`<li>${esc(c.name)}${c.id===d.chosen?' <span class="chip ok">gekozen</span>':''}</li>`).join('')}</ul>
      ${d.chosen?'':`<p class="hint" style="color:var(--warn)">Er is nog geen bedrijf gekozen. Zet in Netlify <b>BC_COMPANY_NAME</b> op een van de namen hierboven en deploy opnieuw.</p>`}
      <div class="dlg-foot"><span class="sp"></span><button class="btn primary" data-act="dlgx">Sluiten</button></div></div>`;$('#modal').hidden=false}
  catch(e){D.apiTest={...(D.apiTest||{}),bc:{ok:false,at:Date.now(),error:apiErr(e)}};save();if(S.tab==='instellingen')render();toast('Koppeling testen: '+apiErr(e))}
}
async function bcFetchState(){if(!SERVER||BCST.demo)return;try{const d=await withPw(()=>api('/api/bc-sync?month='+BCST.month));D.bcSync=D.bcSync||{};D.bcSync[BCST.month]={bc:d.bc,at:(D.bcSync[BCST.month]||{}).at||Date.now()};save();render()}catch(e){toast(apiErr(e))}}
function bcExport(kind){
  const rows=bcRows().filter(r=>r.d.send).map(r=>r.api);
  if(kind==='json')return copyText(JSON.stringify({value:rows},null,2),`${rows.length} regels als JSON gekopieerd (zoals ze naar de BC-API zouden gaan).`);
  const q=v=>{const s=String(v??'');return/[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s},cols=Object.keys(rows[0]||{externalId:1});
  copyText([cols.join(';'),...rows.map(r=>cols.map(c=>q(r[c])).join(';'))].join('\n'),`${rows.length} regels gekopieerd. Plak ze in Excel.`);
}

/* ---------- importlog: per voertuig per periode wat er met de afspraak gebeurde ---------- */
let LOGF={st:'probleem',q:'',m:''},LOGSRC=null;
const LOGST={unplanned:['Niet ingepland','bad'],city:['Plaats onbekend','bad'],nb:['Niet beschikbaar','warn'],cancel:['Geannuleerd','warn'],planned:['Ingepland','ok'],imp:['Te importeren','acc'],past:['In het verleden',''],dup:['Bestaat al',''],gone:['Opdracht verwijderd','']};
const PROBLEM=new Set(['unplanned','city','nb','cancel']);
function liveEntries(src){
  if(src.preview){const fut=$('#xfuture')&&$('#xfuture').checked,t=todayIso();return src.entries.map((e,i)=>({...e,i,st:e.status==='ok'?(fut&&e.date<t?'past':'imp'):e.status,reason:e.status==='ok'&&fut&&e.date<t?'Datum ligt voor vandaag':e.reason}))}
  const memo={};
  return src.entries.map((e,i)=>({...liveOne(e,memo),i}));
}
function liveOne(e,memo){
  {
    if(e.status!=='imp')return{...e,st:e.status};
    const j=JOB[e.jobId];if(!j)return{...e,st:'gone',reason:'Opdracht is na de import verwijderd'};
    const P=D.plans[j.date];let wid=null;if(P&&P.routes)for(const k in P.routes)if(P.routes[k].includes(j.id))wid=k;
    if(wid&&WRK[wid]){const key=wid+'|'+j.date;const s=memo[key]||(memo[key]=simulate(WRK[wid],P.routes[wid],j.date));const g=s.seg.find(x=>x.k==='job'&&x.id===j.id);
      return{...e,st:'planned',date:j.date,reason:`${WRK[wid].name}, ${g?m2t(g.a)+'–'+m2t(g.b):''}${g&&g.late?' (buiten tijdvak)':''}`}}
    return{...e,st:'unplanned',date:j.date,reason:hasPlan(j.date)?whyUnplanned(j,j.date):'Nog niet gepland: open deze dag in Planning'};
  }
}
function logShell(custs){
  const ms=[...new Set(LOGSRC.entries.map(e=>(e.date||'').slice(0,7)).filter(Boolean))].sort();
  return`<div class="logbar"><div id="logChips" class="row"></div><div class="row"><select id="logM" class="mini" aria-label="Maand"><option value="">Alle maanden</option>${ms.map(m=>`<option value="${m}"${LOGF.m===m?' selected':''}>${esc(fdate(m+'-01',{month:'long',year:'numeric'}))}</option>`).join('')}</select>${custs&&custs.length>1?`<select id="logC" class="mini" aria-label="Klant"><option value="">Alle klanten</option>${custs.map(c=>`<option${LOGF.c===c?' selected':''}>${esc(c)}</option>`).join('')}</select>`:''}<label class="jf"><span>Van</span><input type="date" class="mini" id="logFrom" value="${esc(LOGF.from||'')}"></label><label class="jf"><span>Tot en met</span><input type="date" class="mini" id="logTo" value="${esc(LOGF.to||'')}"></label><label class="jf"><span>Sorteren</span><select id="logSort" class="mini">${[['date','Datum oplopend'],['date-','Datum aflopend'],['row','Volgorde in Excel'],['cust','Klant'],['plate','Kenteken']].map(([v,l])=>`<option value="${v}"${(LOGF.sort||'date')===v?' selected':''}>${l}</option>`).join('')}</select></label><label class="search" style="flex:0 1 260px"><input type="search" id="logQ" value="${esc(LOGF.q)}" placeholder="Zoek kenteken, klant, plaats of reden" aria-label="Zoek in log" autocomplete="off"></label></div></div><div id="logBulk"></div><div id="logTbl"></div>`;
}
function logFiltered(all){
  const q=LOGF.q.trim().toLowerCase(),qp=normPlate(q);
  return all.filter(e=>(LOGF.st==='alle'||(LOGF.st==='probleem'?PROBLEM.has(e.st)&&!e.done:LOGF.st==='done'?e.done:LOGF.st==='fixed'?!!e.fixed:e.st===LOGF.st))&&(!LOGF.m||(e.date||'').slice(0,7)===LOGF.m)&&(!LOGF.c||e.cust===LOGF.c)&&(!LOGF.from||(e.date&&e.date>=LOGF.from))&&(!LOGF.to||(e.date&&e.date<=LOGF.to))
    &&(!q||(qp&&normPlate(e.plate).includes(qp))||[e.cust,e.city,e.reason,e.note].some(x=>String(x||'').toLowerCase().includes(q))));
}
function logSort(rows){
  const k=LOGF.sort||'date',d=(a,b)=>(a.date?0:1)-(b.date?0:1)||String(a.date).localeCompare(String(b.date))||String(a.time||'').localeCompare(String(b.time||''))||a.row-b.row;
  const c={date:d,'date-':(a,b)=>(a.date?0:1)-(b.date?0:1)||-String(a.date).localeCompare(String(b.date))||a.row-b.row,row:(a,b)=>a.row-b.row||d(a,b),cust:(a,b)=>String(a.cust).localeCompare(String(b.cust),'nl')||d(a,b),plate:(a,b)=>String(a.plate).localeCompare(String(b.plate))||d(a,b)}[k]||d;
  return rows.slice().sort(c);
}
function logRefresh(){
  if(!LOGSRC||!$('#logTbl'))return;
  const all=liveEntries(LOGSRC),cnt={};all.forEach(e=>cnt[e.st]=(cnt[e.st]||0)+1);const nP=all.filter(e=>PROBLEM.has(e.st)&&!e.done).length,nD=all.filter(e=>e.done).length,nF=all.filter(e=>e.fixed).length;
  const chips=[['probleem','Problemen',nP],['alle','Alles',all.length],...Object.keys(LOGST).filter(k=>cnt[k]).map(k=>[k,LOGST[k][0],cnt[k]]),...(nF?[['fixed','Alsnog ingepland',nF]]:[]),...(nD?[['done','Afgehandeld',nD]]:[])];
  $('#logChips').innerHTML=chips.map(([k,l,n])=>`<button class="fchip" data-act="logf" data-k="${k}" aria-pressed="${LOGF.st===k}">${esc(l)} <span>${n}</span></button>`).join('');
  const rows=logSort(logFiltered(all)),shown=rows.slice(0,500);
  const city=c=>c?(c===c.toUpperCase()?c.charAt(0)+c.slice(1).toLowerCase():c):'';
  $('#logTbl').innerHTML=rows.length?`<div class="tbl-wrap" style="max-height:${LOGSRC.preview?'300px':'56vh'};overflow:auto"><table><thead><tr>${LOGSRC.preview?'':`<th style="width:28px"><input type="checkbox" id="logAll" aria-label="Alles selecteren"${shown.length&&shown.every(e=>LOGSEL.has(e.i))?' checked':''}></th>`}<th>Rij</th><th>Kenteken</th><th>Klant · plaats</th><th>Datum</th><th>Tijdslot</th><th>Status</th><th>Toelichting</th><th></th></tr></thead><tbody>${shown.map(e=>{const s=LOGST[e.st]||[e.st,''];
      return`<tr${e.done?' class="muted-row"':''}>${LOGSRC.preview?'':`<td><input type="checkbox" data-logsel="${e.i}"${LOGSEL.has(e.i)?' checked':''} aria-label="Selecteer ${esc(e.plate)}"></td>`}<td class="mono small">${e.row}</td><td>${plateHtml(e.plate)}</td><td><b>${esc(e.cust)}</b><div class="small muted">${esc(city(e.city))}</div></td><td class="mono small">${e.date?esc(fdate(e.date,{weekday:'short',day:'numeric',month:'short'})):esc(e.per||'—')}</td><td class="mono small">${esc(e.time||'')}</td><td><span class="chip ${s[1]}">${esc(s[0])}</span>${e.fixed?'<div class="small muted" style="margin-top:3px">alsnog ingepland</div>':''}${e.done?'<div class="small muted" style="margin-top:3px">afgehandeld</div>':''}</td><td class="small">${esc(e.reason||'')}${e.note&&e.note!==e.reason?`<div class="muted">${esc(e.note)}</div>`:''}</td><td class="act"><div class="logacts">${LOGSRC.preview?(e.st==='unplanned'?`<button class="btn sm" data-act="propose" data-ids="${e.jobId}">${I.auto} Voorstel</button>`:''):logActs(e)}</div></td></tr>`}).join('')}</tbody></table></div>${rows.length>500?`<p class="hint">De eerste 500 van ${rows.length} regels worden getoond. Verfijn het filter.</p>`:''}`
    :'<p class="empty">Geen regels voor dit filter.</p>';
  logBulkBar();
}
function logBulkBar(){const b=$('#logBulk');if(!b)return;const n=LOGSEL.size;b.innerHTML=n&&!LOGSRC.preview?`<div class="logbulk"><b>${n} geselecteerd</b><button class="btn sm primary" data-act="logbulk">${I.plus} Alsnog inplannen op datum\u2026</button><button class="btn sm" data-act="logbulkdone">Afhandelen</button><button class="btn sm ghost" data-act="logclr">Selectie wissen</button></div>`:''}
function logActs(e){
  const b=(act,lab,extra='',cls='')=>`<button class="btn sm${cls}" data-act="${act}" data-i="${e.i}"${extra}>${lab}</button>`;
  if(e.st==='planned')return b('loggo','Bekijk')+`<button class="btn sm" data-act="editjob" data-id="${e.jobId}">${I.edit} Wijzig</button>`;
  if(e.st==='unplanned')return`<button class="btn sm primary" data-act="propose" data-ids="${e.jobId}">${I.auto} Voorstel</button>`+b('logmove','Andere datum');
  const fix=e.st==='city'?b('logfix',`${I.edit} Adres aanvullen`,'',' primary'):b('logfix',`${I.plus} Alsnog inplannen`,'',PROBLEM.has(e.st)?' primary':'');
  return fix+(PROBLEM.has(e.st)?b('logdone',e.done?'Heropenen':'Afhandelen',` title="${e.done?'Weer als probleem tonen':'Uit de lijst Problemen halen'}"`):'');
}
function openLog(){S.tab='importlog';LOGSRC=null;const lg=curLog();if(lg){const all=liveEntries({entries:lg.entries});LOGF={st:all.some(e=>PROBLEM.has(e.st)&&!e.done)?'probleem':'alle',q:'',m:'',c:''}}if(!$('#modal').hidden)closeForm();render();window.scrollTo(0,0)}
function logCsv(){
  const rows=logFiltered(liveEntries(LOGSRC)),q=v=>{const s=String(v??'');return/[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  const lines=[['Rij','Kenteken','Klant','Plaats','Periode','Datum','Tijdslot','Status','Toelichting','Opmerking'].join(';')].concat(rows.map(e=>[e.row,e.plate,e.cust,e.city,e.per,e.date,e.time,(LOGST[e.st]||[e.st])[0],e.reason,e.note].map(q).join(';')));
  copyText(lines.join('\n'),`${rows.length} regels gekopieerd. Plak ze in Excel.`);
}

function copyText(t,okMsg){const done=()=>toast(okMsg);try{navigator.clipboard.writeText(t).then(done,()=>showCopy(t))}catch(e){showCopy(t)}}
function showCopy(t){openForm({title:'Back-up',note:'Selecteer de tekst en kopieer hem.',fields:[{k:'csv',label:'Gegevens (JSON)',type:'textarea'}],values:{csv:t},onSave:()=>''});setTimeout(()=>{const a=$('#f_csv');if(a){a.select()}},20)}

