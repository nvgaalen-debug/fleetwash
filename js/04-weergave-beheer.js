/* ---------- weergave ---------- */
let toastT;
function toast(msg,ms){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,ms||3200)}
/* ---------- menu: indeling instelbaar via Beheer > Menu indelen ---------- */
const MENU_ITEMS={
  'planning':['Planning','Dagplanning, kaart en meldingen'],
  'opdrachten':['Overzicht opdrachten','Alle reinigingsopdrachten zoeken en wijzigen'],
  'importlog':['Importlog','Wat er met elke geïmporteerde afspraak gebeurde'],
  'act:import':['Excel importeren','Nieuwe lijst inlezen en plannen'],
  'klanten':['Klanten & locaties','Klanten, adressen en locatie-info'],
  'medewerkers':['Gegevens medewerkers','Werktijden, standplaats, vaardigheden en app-link'],
  'afwezigheid':['Afwezigheid','Verlofkalender, ziekte, training en verlofsaldo'],
  'act:msgs':['Berichten','Berichten naar de app van medewerkers'],
  'instellingen:planning':['Planning en reistijd','Rekenregels, pauze, werkdag en rijtijden'],
  'instellingen:types':['Reinigingstypes','Soorten reiniging, duur en vaardigheden'],
  'instellingen:data':['Gegevens en back-up','Back-up kopiëren of terugzetten'],
  'instellingen:archief':['Archief','Gereed gemelde bezoeken archiveren, bekijken en oude planningen opruimen'],
  'instellingen:menu':['Menu indelen','Kies wat in het hoofdmenu en in de groepen staat'],
  'act:logout':['Uitloggen','App-wachtwoord vergeten op deze computer'],
  'facturatie':['Business Central interface','Gereedmeldingen per maand naar BC voor facturatie'],
  'instellingen:api':['API koppelingen','Business Central testen en exporteren, rijtijden, adressen en AI']};
const MENU_SHORT={'opdrachten':'Overzicht','medewerkers':'Gegevens'};
const menuDefault=()=>({top:['planning','g:opdr','klanten','g:mw','g:beheer'],groups:{opdr:{l:'Opdrachten',items:['opdrachten','importlog','facturatie','act:import']},mw:{l:'Medewerkers',items:['medewerkers','afwezigheid','act:msgs']},beheer:{l:'Beheer',items:['instellingen:planning','instellingen:types','instellingen:data','instellingen:archief','instellingen:api','instellingen:menu','act:logout']}},hidden:[]});
function menuCfg(){
  let m=D.menu;if(!m||!m.top||!m.groups)m=D.menu=menuDefault();
  const placed=new Set([...m.top.filter(x=>!x.startsWith('g:')),...Object.values(m.groups).flatMap(g=>g.items),...(m.hidden||[])]);
  const PREF={facturatie:'opdr'};
  for(const id of Object.keys(MENU_ITEMS))if(!placed.has(id)){const g=m.groups[PREF[id]]||m.groups.beheer||Object.values(m.groups)[0];if(g){const li=g.items.indexOf('act:logout');if(li>=0)g.items.splice(li,0,id);else g.items.push(id)}else m.top.push(id)}
  m.top=m.top.filter(x=>x.startsWith('g:')?m.groups[x.slice(2)]:MENU_ITEMS[x]);
  for(const k in m.groups)if(!m.top.includes('g:'+k))m.top.push('g:'+k);
  m.hidden=(m.hidden||[]).filter(x=>x!=='instellingen:menu');
  return m;
}
const mLabel=(id,inGroup)=>(inGroup&&MENU_SHORT[id])||MENU_ITEMS[id][0];
function buildNav(){const m=menuCfg();return m.top.map(x=>{if(!x.startsWith('g:'))return{k:x,l:mLabel(x),to:x,d:MENU_ITEMS[x][1]};const g=m.groups[x.slice(2)];return{k:x,l:g.l,items:g.items.map(id=>[id,mLabel(id,true),MENU_ITEMS[id][1]])}}).filter(g=>!g.items||g.items.length)}
function menuLoc(id){const m=menuCfg();if(m.hidden.includes(id))return'hidden';if(m.top.includes(id))return'top';for(const k in m.groups)if(m.groups[k].items.includes(id))return'g:'+k;return'top'}
function menuMove(id,to){
  const m=menuCfg();m.top=m.top.filter(x=>x!==id);m.hidden=m.hidden.filter(x=>x!==id);for(const k in m.groups)m.groups[k].items=m.groups[k].items.filter(x=>x!==id);
  if(to==='top')m.top.push(id);else if(to==='hidden')m.hidden.push(id);else m.groups[to.slice(2)].items.push(id);
}
function menuShift(list,id,d){const i=list.indexOf(id),j=i+d;if(i<0||j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]]}
function viewMenu(){
  const m=menuCfg(),gids=Object.keys(m.groups);
  const opts=id=>[['top','Hoofdmenu'],...gids.map(k=>['g:'+k,'Onder '+m.groups[k].l]),...(id==='instellingen:menu'?[]:[['hidden','Verbergen']])];
  const row=(id,list,where)=>`<li class="mrow"><span class="mgrip" aria-hidden="true">≡</span><div class="mlab"><b>${esc(MENU_ITEMS[id][0])}</b><small>${esc(MENU_ITEMS[id][1])}</small></div>
    <select class="mini" data-menuloc="${id}" aria-label="Plaats van ${esc(MENU_ITEMS[id][0])}">${opts(id).map(([v,l])=>`<option value="${v}"${menuLoc(id)===v?' selected':''}>${esc(l)}</option>`).join('')}</select>
    ${where!=='hidden'?`<button class="iconbtn" data-act="menuup" data-id="${id}" data-w="${where}" aria-label="Omhoog"${list.indexOf(id)===0?' disabled':''}>${I.up}</button><button class="iconbtn" data-act="menudown" data-id="${id}" data-w="${where}" aria-label="Omlaag"${list.indexOf(id)===list.length-1?' disabled':''}>${I.down}</button>`:''}</li>`;
  const topRows=m.top.map(x=>{if(!x.startsWith('g:'))return row(x,m.top,'top');const k=x.slice(2),g=m.groups[k];
    return`<li class="mrow mgroup"><span class="mgrip" aria-hidden="true">▾</span><div class="mlab"><input class="mini" data-menuname="${k}" value="${esc(g.l)}" aria-label="Naam van groep" style="font-weight:600;max-width:220px"><small>Groep met ${g.items.length} onderdeel${g.items.length===1?'':'en'}${g.items.length?'':' (wordt niet getoond)'}</small></div>
      ${g.items.length?'':`<button class="btn sm ghost" data-act="menudelg" data-k="${k}">${I.trash} Verwijderen</button>`}
      <button class="iconbtn" data-act="menuup" data-id="${x}" data-w="top" aria-label="Omhoog"${m.top.indexOf(x)===0?' disabled':''}>${I.up}</button><button class="iconbtn" data-act="menudown" data-id="${x}" data-w="top" aria-label="Omlaag"${m.top.indexOf(x)===m.top.length-1?' disabled':''}>${I.down}</button></li>`}).join('');
  const groups=gids.map(k=>{const g=m.groups[k];return`<section class="panel sec"><h3>${esc(g.l)} <span class="muted small">uitklapmenu</span></h3>${g.items.length?`<ul class="mlist">${g.items.map(id=>row(id,g.items,'g:'+k)).join('')}</ul>`:'<p class="small muted" style="margin:0">Leeg. Zet hier onderdelen neer via de keuzelijst bij een onderdeel.</p>'}</section>`}).join('');
  return`<section class="panel sec"><div class="toolbar"><h2>Menu indelen</h2><span class="sp"></span><button class="btn" data-act="menunewg">${I.plus} Nieuwe groep</button><button class="btn ghost" data-act="menureset">Standaard herstellen</button></div>
    <p class="hint" style="margin:0">Kies per onderdeel of het los in het hoofdmenu staat, onder een groep (uitklapmenu), of verborgen is. Met de pijltjes bepaal je de volgorde. Wijzigingen zie je direct in de menubalk. De indeling geldt voor deze browser.</p>
    <h3>Hoofdmenu <span class="muted small">van links naar rechts</span></h3><ul class="mlist">${topRows}</ul></section>
    <div class="mgrid">${groups}</div>
    ${m.hidden.length?`<section class="panel sec"><h3>Verborgen</h3><ul class="mlist">${m.hidden.map(id=>row(id,m.hidden,'hidden')).join('')}</ul></section>`:''}`;
}

const navCur=()=>S.tab==='instellingen'?'instellingen:'+(S.setPage||'planning'):S.tab;
const navGroup=()=>buildNav().find(g=>g.to===S.tab||(g.items||[]).some(([t])=>t===navCur()))||{};
function navTo(t){
  if(t.startsWith('act:')){closeMenus();const a=t.slice(4);if(a==='import')openXlsxImport();else if(a==='msgs')openMsgs({});else if(a==='logout')logoutPw();return}
  const[tab,sub]=t.split(':');S.tab=tab;if(sub)S.setPage=sub;closeMenus();render();window.scrollTo(0,0);
}
function closeMenus(){document.querySelectorAll('.navg.open').forEach(g=>{g.classList.remove('open');const b=g.querySelector('[aria-expanded]');if(b)b.setAttribute('aria-expanded','false')})}
function renderNav(nIss){
  const cur=navCur(),grp=navGroup(),nLog=(()=>{try{const lg=curLog();if(!lg||!Array.isArray(lg.entries))return 0;return liveEntries({entries:lg.entries}).filter(e=>PROBLEM.has(e.st)&&!e.done).length}catch(e){console.error(e);return 0}})();
  const badge=(n,t,neutral)=>n?` <span class="tabbadge${neutral?' neu':''}" title="${esc(t)}">${n}</span>`:'';
  const itemBadge=t=>t==='importlog'?badge(nLog,nLog+' problemen in de laatste import',true):t==='act:msgs'?badge(msgUnread(),'ongelezen berichten'):'';
  const NAV=buildNav();
  $('#tabs').innerHTML=NAV.map(g=>{
    const on=g===grp;
    if(!g.items)return`<button class="tab" data-act="navto" data-to="${g.to}" aria-pressed="${on}" title="${esc(g.d)}">${esc(g.l)}${g.k==='planning'?badge(nIss,nIss+' open melding(en) en ongelezen berichten van medewerkers'):itemBadge(g.k)}</button>`;
    const ids=g.items.map(x=>x[0]),red=ids.includes('act:msgs')?msgUnread():0,neu=ids.includes('importlog')?nLog:0;
    return`<div class="navg"><button class="tab" data-act="navg" aria-haspopup="true" aria-expanded="false" aria-pressed="${on}">${esc(g.l)}${red||neu?`<span class="navdot${red?'':' neu'}" aria-label="${red||neu} nieuw"></span>`:''}<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <div class="navmenu" role="menu">${g.items.map(([t,l,d])=>`<button role="menuitem" data-act="navto" data-to="${t}"${t===cur?' aria-current="page"':''}><b>${esc(l)}${itemBadge(t)}</b><small>${esc(d)}</small></button>`).join('')}</div></div>`}).join('');
  const sub=$('#subnav');
  if(grp.items){sub.hidden=false;sub.innerHTML=`<div class="subnav-in gut"><span class="subnav-t">${esc(grp.l)}</span>${grp.items.map(([t,l])=>`<button data-act="navto" data-to="${t}" aria-pressed="${t===cur}">${t.startsWith('act:')?(t==='act:import'?I.imp:t==='act:msgs'?I.chat:I.unlock)+' ':''}${esc(l)}${itemBadge(t)}</button>`).join('')}</div>`}
  else{sub.hidden=true;sub.innerHTML=''}
}
function showFatal(where,err){
  console.error('[Wasroute] fout in '+where,err);
  const v=$('#view');if(!v)return;const msg=String(err&&err.message||err),st=String(err&&err.stack||'').split('\n').slice(0,4).join('\n');
  v.innerHTML=`<section class="panel sec" style="border-color:var(--bad)"><h2>Er ging iets mis bij het tonen van deze pagina</h2>
    <p>Je gegevens zijn niet verloren. Stuur de tekst hieronder door, dan wordt het opgelost. Maak voor de zekerheid een back-up.</p>
    <pre class="small" style="white-space:pre-wrap;background:var(--sunk);padding:10px;border-radius:8px;margin:0">${esc(where+': '+msg+'\n'+st)}</pre>
    <div class="row"><button class="btn primary" data-act="rawbackup">Back-up kopiëren</button><button class="btn" data-act="navto" data-to="planning">Naar Planning</button><button class="btn" data-act="navto" data-to="instellingen:data">Gegevens en back-up</button></div></section>`;
}
function render(){
  try{renderInner()}catch(err){
    try{if(!$('#tabs').innerHTML)$('#tabs').innerHTML=['planning','opdrachten','klanten','medewerkers','instellingen'].map(t=>`<button class="tab" data-act="navto" data-to="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join('')}catch(e){}
    showFatal('scherm '+S.tab,err);
  }
}
function renderInner(){
  let nIss=0;try{nIss=SERVER?openIssues(S.date)+msgUnread():0}catch(e){console.error(e)}
  renderNav(nIss);$('#datebar').hidden=!['planning','opdrachten'].includes(S.tab);
  $('#dateIn').value=S.date;{const pv=S.tab==='planning'?pview():'dag';$('#dayName').textContent=pv==='week'?weekLabel(S.date):pv==='maand'?fdate(S.date,{month:'long',year:'numeric'}):fdate(S.date,{weekday:'long'});
    const sg=$('#pviewSeg');if(sg){sg.hidden=S.tab!=='planning';sg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===pv)))}}
  const v=$('#view');
  if(S.tab==='planning')v.innerHTML=pview()==='week'?viewWeek():pview()==='maand'?viewMonth():viewPlanning();
  else if(S.tab==='opdrachten')v.innerHTML=viewJobs();
  else if(S.tab==='klanten')v.innerHTML=viewCustomers();
  else if(S.tab==='medewerkers')v.innerHTML=viewWorkers();
  else if(S.tab==='afwezigheid')v.innerHTML=viewAbsence();
  else if(S.tab==='facturatie')v.innerHTML=viewBC();
  else if(S.tab==='importlog'){v.innerHTML=viewImportLog();if(LOGSRC)logRefresh()}
  else v.innerHTML=viewSettings();
}
function dayState(date=S.date,noAuto){
  const jobs=jobsOn(date);
  if(!noAuto&&!hasPlan(date)&&jobs.length){autoPlan(date);save()}
  const P=cleanPlan(date);
  const rows=D.workers.filter(w=>avail(w,date)||(P.routes[w.id]||[]).length);
  const sims={};rows.forEach(w=>sims[w.id]=simulate(w,P.routes[w.id]||[],date));
  const planned=new Set(rows.flatMap(w=>P.routes[w.id]||[]));
  const un=jobs.filter(j=>!planned.has(j.id));
  return{date,jobs,P,rows,sims,un,off:D.workers.filter(w=>!avail(w,date))};
}
/* ---------- Planning per week en per maand ---------- */
const pview=()=>S.pview||'dag';
const weekStart=d=>addDays(d,-((wday(d)+6)%7));
function isoWeek(d){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+3-((x.getDay()+6)%7));const w1=new Date(x.getFullYear(),0,4);return 1+Math.round(((x-w1)/864e5-3+((w1.getDay()+6)%7))/7)}
function weekLabel(d){const a=weekStart(d),b=addDays(a,6);return`week ${isoWeek(d)} · ${fdate(a,{day:'numeric',month:a.slice(5,7)===b.slice(5,7)?undefined:'short'})}–${fdate(b,{day:'numeric',month:'short'})}`}
function addMonths(d,n){const[y,m,dd]=d.split('-').map(Number);const t=new Date(y,m-1+n,1,12);const last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();t.setDate(Math.min(dd,last));return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`}
function stepPeriod(n){const v=S.tab==='planning'?pview():'dag';S.date=v==='week'?addDays(S.date,7*n):v==='maand'?addMonths(S.date,n):addDays(S.date,n);S.selLoc=null;save();render()}
function viewWeek(){
  const a=weekStart(S.date),days=[...Array(7)].map((_,i)=>addDays(a,i)),today=todayIso();
  const st=days.map(d=>dayState(d));
  const ws=D.workers.slice();
  let tot=0,pl=0,unT=0;st.forEach(x=>{tot+=x.jobs.length;unT+=x.un.length;pl+=x.jobs.length-x.un.length});
  const head=days.map((d,i)=>{const x=st[i];return`<th class="wk-day${d===today?' is-today':''}${d===S.date?' is-sel':''}"><button class="linkbtn" data-act="gotoday" data-date="${d}">${esc(fdate(d,{weekday:'short',day:'numeric',month:'short'}))}</button>
    <div class="small">${x.jobs.length?`<b>${x.jobs.length-x.un.length}/${x.jobs.length}</b> gepland${x.un.length?` <span class="chip bad">${x.un.length} open</span>`:''}`:'<span class="muted">geen opdrachten</span>'}</div></th>`}).join('');
  const body=ws.map(w=>`<tr><td class="wk-who"><b><i class="dot" style="background:${wc(w)}"></i> ${esc(w.name)}</b><div class="small muted">${esc(w.start||'')}–${esc(w.end||'')}</div></td>${days.map((d,i)=>{const x=st[i],why=availWhy(w,d),ids=x.P.routes[w.id]||[];
      if(why&&!ids.length)return`<td class="wk-cell wk-off" title="${esc(why)}"><span class="small muted">${esc(why.length>22?why.slice(0,20)+'…':why)}</span></td>`;
      if(!ids.length)return`<td class="wk-cell"><button class="wk-hit" data-act="gotoday" data-date="${d}" data-wid="${w.id}" aria-label="${esc(w.name)} op ${esc(fdate(d))}"><span class="small muted">—</span></button></td>`;
      const s=x.sims[w.id]||simulate(w,ids,d),stops=s.stops.map(p=>(CUS[p.loc.customerId]||{}).name||'');const u=Math.min(100,Math.round(s.serv/Math.max(1,s.end-s.start)*100));
      return`<td class="wk-cell has" style="--c:${wc(w)}"><button class="wk-hit" data-act="gotoday" data-date="${d}" data-wid="${w.id}" title="${esc(stops.join(', '))}">
        <b>${s.n} voert.</b> <span class="small muted">${m2t(s.depart)}–${m2t(s.finish)}</span>
        <span class="wk-bar"><i style="width:${u}%"></i></span>
        <span class="small">${esc([...new Set(stops)].slice(0,3).join(', '))}${new Set(stops).size>3?' …':''}</span>
        <span class="small muted">${fkm(s.km)} · ${fdur(s.trav)} rijden</span>${s.lateJobs.length||s.over>.5?'<span class="chip bad">let op</span>':''}</button></td>`}).join('')}</tr>`).join('');
  return`<section class="panel kpis"><div class="kpi ${unT?'':'okk'}"><b>${pl} / ${tot}</b><span>voertuigen gepland deze week</span></div><div class="kpi ${unT?'bad':'okk'}"><b>${unT}</b><span>niet ingepland</span></div><div class="kpi"><b>${days.filter((d,i)=>st[i].jobs.length).length}</b><span>dagen met opdrachten</span></div>
    <div class="acts"><span class="small muted">Klik op een dag of medewerker om de dagplanning te openen · pijltjestoetsen = vorige/volgende week</span></div></section>
    <section class="panel sec"><h2>${esc(weekLabel(S.date))}</h2><div class="tbl-wrap wk-wrap"><table class="wk"><thead><tr><th></th>${head}</tr></thead><tbody>${body||'<tr><td colspan="8" class="empty">Nog geen medewerkers</td></tr>'}</tbody></table></div></section>`;
}
function viewMonth(){
  const [y,m]=S.date.split('-').map(Number),first=`${y}-${String(m).padStart(2,'0')}-01`,start=weekStart(first),today=todayIso();
  const weeks=[];let d=start;do{weeks.push([...Array(7)].map((_,i)=>addDays(d,i)));d=addDays(d,7)}while(d.slice(0,7)<=first.slice(0,7)&&weeks.length<6);
  let tot=0,pl=0,openDays=0;
  const cell=dd=>{const inM=dd.slice(0,7)===first.slice(0,7),jobs=jobsOn(dd),planned=hasPlan(dd);let p=0;
    if(planned){const P=D.plans[dd];const ids=new Set(Object.values(P.routes||{}).flat());p=jobs.filter(j=>ids.has(j.id)).length}
    const free=D.workers.filter(w=>avail(w,dd)).length,abs=D.workers.filter(w=>(w.absent||[]).includes(dd)).length,un=planned?jobs.length-p:0;
    if(inM){tot+=jobs.length;pl+=p;if(jobs.length&&(un||!planned))openDays++}
    const pct=jobs.length?Math.round(p/jobs.length*100):0;
    return`<td class="mo-cell${inM?'':' other'}${wday(dd)%6===0?' wkend':''}${dd===today?' is-today':''}${dd===S.date?' is-sel':''}"><button class="mo-hit" data-act="gotoday" data-date="${dd}" aria-label="${esc(fdate(dd))}">
      <span class="mo-d">${Number(dd.slice(8))}</span>
      ${jobs.length?`<span class="mo-n"><b>${jobs.length}</b> opdr.</span><span class="wk-bar"><i style="width:${pct}%"></i></span><span class="small">${planned?(un?`<span style="color:var(--bad)">${un} open</span>`:'alles gepland'):'<span class="muted">nog niet gepland</span>'}</span>`:''}
      <span class="small muted">${free} medew.${abs?` · ${abs} afwezig`:''}</span>${jobs.length&&!free?'<span class="chip bad">geen medewerker</span>':''}</button></td>`};
  const rows=weeks.map(w=>`<tr><th class="mo-wk"><button class="linkbtn" data-act="gotoweek" data-date="${w[0]}" title="Open deze week">wk ${isoWeek(w[0])}</button></th>${w.map(cell).join('')}</tr>`).join('');
  return`<section class="panel kpis"><div class="kpi"><b>${tot}</b><span>opdrachten in ${esc(fdate(first,{month:'long'}))}</span></div><div class="kpi ${pl<tot?'':'okk'}"><b>${pl} / ${tot}</b><span>ingepland</span></div><div class="kpi ${openDays?'bad':'okk'}"><b>${openDays}</b><span>dagen met open opdrachten</span></div>
    <div class="acts"><span class="small muted">Klik op een dag voor de dagplanning, op een weeknummer voor de week</span></div></section>
    <section class="panel sec"><h2>${esc(fdate(first,{month:'long',year:'numeric'}))}</h2><div class="tbl-wrap"><table class="mo"><thead><tr><th></th>${['ma','di','wo','do','vr','za','zo'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function viewPlanning(){
  const st=dayState(),{jobs,P,rows,sims,un,off}=st;
  if(SERVER&&!STATUS[st.date])fetchStatus(st.date,true);
  if(SERVER&&!MSG.at)fetchMsgs(true);
  if(!S.wid||!rows.find(w=>w.id===S.wid))S.wid=(rows.find(w=>(P.routes[w.id]||[]).length)||rows[0]||{}).id||null;
  let km=0,tr=0,sv=0,late=0,over=0,util=0,nUtil=0;
  rows.forEach(w=>{const s=sims[w.id];km+=s.km;tr+=s.trav;sv+=s.serv;late+=s.lateJobs.length;if(s.over>.5)over++;if(s.n){util+=s.serv/Math.max(1,(s.end-s.start));nUtil++}});
  const warn=late+over+rows.filter(w=>!avail(w,st.date)).length;
  const edited=P.edited?`<span class="chip acc">${I.edit} Handmatig aangepast</span>`:'';
  const kpis=`<section class="panel kpis">
    <div class="kpi ${un.length?'':'okk'}"><b>${jobs.length-un.length} / ${jobs.length}</b><span>voertuigen gepland</span></div>
    <div class="kpi"><b>${fdur(tr)}</b><span>totale reistijd</span></div>
    <div class="kpi"><b>${fkm(km)}</b><span>gereden</span></div>
    <div class="kpi"><b>${fdur(sv)}</b><span>reinigingstijd</span></div>
    <div class="kpi"><b>${nUtil?Math.round(util/nUtil*100):0}%</b><span>benutting werktijd</span></div>
    <div class="kpi ${warn?'bad':'okk'}"><b>${warn}</b><span>waarschuwingen</span></div>
    ${stKpi(st.date,rows,P)}
    <div class="acts">${orsChip(st.date,rows)}${edited}${pubChip(st.date)}${msgBtn()}<button class="btn" data-act="publish" title="Ritten klaarzetten in de medewerker-app">${I.send} Publiceer naar medewerkers</button><button class="btn" data-act="unpinall" title="Alle handmatige vastzettingen voor deze dag opheffen">${I.unlock} Vastzetten opheffen</button><button class="btn" data-act="mailklant" title="Planning van deze dag per klant mailen">Mail planning klant</button><button class="btn" data-act="aiday" title="AI maakt een voorstel voor deze dag">AI-voorstel dag</button><button class="btn" data-act="aiweek" title="AI maakt een voorstel voor de hele week">AI-voorstel week</button><button class="btn primary" data-act="auto">${I.auto} Automatisch plannen</button></div>
  </section>`;
  if(!jobs.length)return kpis+`<section class="panel empty"><h2>Geen opdrachten op ${esc(fdate(st.date))}</h2><p>Voeg opdrachten toe onder Opdrachten of kies een andere datum.</p><button class="btn primary" data-act="newjob">${I.plus} Nieuwe opdracht</button></section>`;
  return kpis+sickBanner()+reportsPanel(st)+timeline(st)+`<div class="split">${mapPanel(st)}${routePanel(st)}</div>`+unplannedPanel(st)
    +(off.length?`<p class="small muted">Niet beschikbaar: ${off.map(w=>esc(w.name)+' ('+esc(availWhy(w,st.date).toLowerCase())+')').join(', ')}.</p>`:'');
}
function timeline(st){
  const{rows,sims,date}=st;
  let a=Infinity,b=-Infinity;rows.forEach(w=>{const s=sims[w.id];a=Math.min(a,s.depart);b=Math.max(b,s.end,s.finish)});
  if(!isFinite(a)){a=420;b=1080}
  const rs=Math.floor((a-30)/60)*60,re=Math.ceil((b+30)/60)*60,pc=m=>((m-rs)/(re-rs)*100).toFixed(3)+'%',wd=(x,y)=>((y-x)/(re-rs)*100).toFixed(3)+'%';
  let ticks='',grid='';for(let h=rs;h<=re;h+=60){ticks+=`<span style="left:${pc(h)}">${m2t(h)}</span>`;grid+=`<i class="grid-h" style="left:${pc(h)}"></i>`}
  const out=rows.map(w=>{
    const s=sims[w.id],c=wc(w),why=availWhy(w,date);let blk='';
    blk+=`<i class="off" style="left:0;width:${pc(s.start)}"></i><i class="off" style="left:${pc(s.end)};right:0"></i>`;
    if(s.over>.5)blk+=`<i class="overrun" style="left:${pc(s.end)};width:${wd(s.end,s.finish)}" title="${fdur(s.over)} na einde werktijd"></i>`;
    for(const g of s.seg){
      if(g.k==='drive'||g.k==='return')blk+=`<div class="blk drive" style="left:${pc(g.a)};width:${wd(g.a,g.b)};--c:${c}" title="Rijden ${m2t(g.a)}–${m2t(g.b)} · ${fkm(g.km)}"></div>`;
      else if(g.k==='wait')blk+=`<div class="blk wait" style="left:${pc(g.a)};width:${wd(g.a,g.b)}" title="Wachten op tijdvenster ${m2t(g.a)}–${m2t(g.b)}"></div>`;
      else if(g.k==='pause')blk+=`<div class="blk pause" style="left:${pc(g.a)};width:${wd(g.a,g.b)}" title="Pauze ${m2t(g.a)}–${m2t(g.b)}">P</div>`;
    }
    s.stops.forEach((p,i)=>{const cu=CUS[p.loc.customerId]||{};const sel=S.selLoc===p.loc.id&&S.wid===w.id;
      blk+=`<div class="blk job${p.late?' late':''}${sel?' sel':''}" draggable="true" data-drag="${p.jobs.join(',')}" data-act="visit" title="Klik voor details" data-wid="${w.id}" data-loc="${p.loc.id}" style="left:${pc(p.start)};width:${wd(p.start,p.end)};--c:${c}" title="${esc(cu.name)} · ${p.jobs.length} voertuig(en) · ${m2t(p.start)}–${m2t(p.end)}${p.late?' · TE LAAT':''}">${(()=>{const m=stMap(date),ss=p.jobs.map(id=>m[id]).filter(Boolean);return ss.some(x=>x.st==='issue')?'<b class="bmark bad">!</b>':ss.length===p.jobs.length&&ss.length?'<b class="bmark ok">✓</b>':ss.some(x=>x.note)?'<b class="bmark">…</b>':''})()}${i+1}. ${esc(cu.name||'')}<small>${p.jobs.length}× · ${m2t(p.start)}</small></div>`});
    blk+=`<i class="endmark" style="left:${pc(s.finish)}" title="Terug ${m2t(s.finish)}"></i>`;
    return`<div class="tl-row"><button class="tl-who${S.wid===w.id?' sel':''}${why?' na':''}" data-act="selw" data-wid="${w.id}"><b><i class="dot" style="background:${c}"></i>${esc(w.name)}</b><small>${esc(w.postcode)} ${esc(w.city)} · ${esc(shiftOf(w,date).start)}–${esc(shiftOf(w,date).end)}</small>${ovr(w,date)?`<small><span class="chip warn">Afwijkende werktijd</span></small>`:''}<small>${why?`<span style="color:var(--bad)">${esc(why)}</span>`:`${s.n} voert. · ${fkm(s.km)} · ${fdur(s.trav)} rijden`}</small></button><div class="tl-track" data-drop="row:${w.id}" data-wid="${w.id}" data-rs="${rs}" data-re="${re}">${grid}${blk}</div></div>`}).join('');
  return`<section class="panel"><div class="tl-head"><h2>Dagplanning ${esc(fdate(date,{day:'numeric',month:'long'}))}</h2><div class="legend"><span><i class="lg job"></i>Reinigen</span><span><i class="lg drive"></i>Rijden</span><span><i class="lg wait"></i>Wachten op venster</span><span><i class="lg pause"></i>Pauze</span></div><span class="sp"></span><span class="small muted">Sleep een blok naar een andere medewerker om te herplannen</span></div>
  <div class="tl-wrap"><div class="tl"><div class="tl-row"><div style="background:var(--sunk);border-right:1px solid var(--line)"></div><div class="tl-axis">${ticks}</div></div>${out}</div></div></section>`;
}
const NL=[[3.36,51.37],[3.6,51.3],[3.9,51.21],[4.25,51.37],[4.5,51.48],[4.8,51.5],[5.05,51.47],[5.22,51.31],[5.5,51.3],[5.84,51.16],[5.65,50.86],[5.7,50.76],[6.02,50.76],[6.08,50.91],[5.9,51.0],[6.17,51.18],[6.07,51.25],[6.22,51.4],[5.95,51.75],[6.12,51.85],[6.4,51.85],[6.75,51.9],[6.83,52.0],[6.7,52.05],[7.05,52.23],[7.05,52.4],[6.7,52.47],[6.75,52.65],[7.05,52.65],[7.2,53.0],[7.2,53.25],[6.9,53.35],[6.5,53.45],[6.0,53.45],[5.6,53.35],[5.35,53.2],[5.1,52.95],[5.4,52.85],[5.6,52.65],[5.85,52.55],[5.6,52.38],[5.25,52.33],[5.05,52.4],[5.1,52.62],[5.3,52.7],[5.1,52.93],[4.75,52.95],[4.6,52.6],[4.5,52.3],[4.25,52.1],[3.95,51.95],[4.05,51.85],[3.7,51.7],[3.45,51.55],[3.36,51.37]];
const CITIES=[['Amsterdam',52.37,4.90],['Rotterdam',51.92,4.48],['Den Haag',52.08,4.31],['Utrecht',52.09,5.12],['Den Bosch',51.69,5.30],['Eindhoven',51.44,5.48],['Tilburg',51.56,5.09],['Breda',51.59,4.78],['Arnhem',51.98,5.91],['Nijmegen',51.84,5.86],['Zwolle',52.51,6.09],['Groningen',53.22,6.57],['Amersfoort',52.16,5.39],['Dordrecht',51.81,4.67],['Venlo',51.37,6.17],['Maastricht',50.85,5.69],['Apeldoorn',52.21,5.97],['Enschede',52.22,6.89],['Leeuwarden',53.20,5.79],['Middelburg',51.50,3.61],['Tiel',51.89,5.43],['Gorinchem',51.84,4.97],['Helmond',51.48,5.66],['Oss',51.77,5.52]];
function mapPanel(st){
  const{rows,sims,un}=st,W=1000,H=680,kx=Math.cos(52.1*Math.PI/180);
  const shown=S.mapMode==='focus'?rows.filter(w=>w.id===S.wid):rows;
  let pts=[];
  if(S.mapMode==='nl')pts=[[50.75,3.36],[53.47,7.2]];
  else{shown.forEach(w=>{pts.push([+w.lat,+w.lng]);sims[w.id].stops.forEach(p=>pts.push([+p.loc.lat,+p.loc.lng]))});if(S.mapMode!=='focus')un.forEach(j=>{const l=LOC[j.locationId];if(l)pts.push([+l.lat,+l.lng])})}
  if(!pts.length)pts=[[50.75,3.36],[53.47,7.2]];
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;pts.forEach(([la,lo])=>{const x=lo*kx,y=-la;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)});
  let dx=Math.max(x1-x0,.12),dy=Math.max(y1-y0,.1);const cx=(x0+x1)/2,cy=(y0+y1)/2;dx*=1.25;dy*=1.25;
  const sc=Math.min(W/dx,H/dy);const P=(la,lo)=>[((lo*kx-cx)*sc+W/2).toFixed(1),((-la-cy)*sc+H/2).toFixed(1)];
  let g=`<rect width="${W}" height="${H}" fill="var(--water)"/><path class="land" d="M${NL.map(([lo,la])=>P(la,lo).join(' ')).join('L')}Z"/>`;
  g+=CITIES.map(([n,la,lo])=>{const[x,y]=P(la,lo);if(x<10||x>W-10||y<10||y>H-10)return'';return`<g class="city"><circle cx="${x}" cy="${y}" r="2.5"/><text x="${+x+6}" y="${+y-5}">${n}</text></g>`}).join('');
  const order=[...shown].sort((a,b)=>(a.id===S.wid)-(b.id===S.wid));
  for(const w of order){
    const s=sims[w.id],c=wc(w),op=S.mapMode==='focus'||w.id===S.wid?1:.4;
    const chain=[[+w.lat,+w.lng],...s.stops.map(p=>[+p.loc.lat,+p.loc.lng]),[+w.lat,+w.lng]];
    let lines='';
    if(s.stops.length)for(let i=0;i<chain.length-1;i++){const[a1,b1]=P(...chain[i]),[a2,b2]=P(...chain[i+1]);const mx=(+a1+ +a2)/2,my=(+b1+ +b2)/2,ang=Math.atan2(b2-b1,a2-a1)*180/Math.PI;const len=Math.hypot(a2-a1,b2-b1);
      lines+=`<line class="leg" x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" style="stroke:${c}"${i===chain.length-2?' stroke-dasharray="7 6"':''}/>`;
      if(len>40)lines+=`<path d="M-7 -6L5 0L-7 6Z" transform="translate(${mx} ${my}) rotate(${ang.toFixed(1)})" style="fill:${c}"/>`}
    const[dxp,dyp]=P(+w.lat,+w.lng);
    let mk=`<g class="depot" data-act="selw" data-wid="${w.id}" style="cursor:pointer"><title>Standplaats ${esc(w.name)} (${esc(w.postcode)})</title><rect x="${dxp-12}" y="${dyp-12}" width="24" height="24" rx="5" style="fill:${c}" stroke="var(--surface)" stroke-width="2"/><text x="${dxp}" y="${dyp}">${esc(w.name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</text></g>`;
    s.stops.forEach((p,i)=>{const[x,y]=P(+p.loc.lat,+p.loc.lng);const cu=CUS[p.loc.customerId]||{};const r=11+Math.min(p.jobs.length,6);
      mk+=`<g class="mk" data-act="sel" data-wid="${w.id}" data-loc="${p.loc.id}"><title>${i+1}. ${esc(cu.name)} – ${esc(p.loc.city)} · ${p.jobs.length} voertuig(en) · ${m2t(p.arrive)}</title>${S.selLoc===p.loc.id&&S.wid===w.id?`<circle class="selring" cx="${x}" cy="${y}" r="${r+5}"/>`:''}<circle cx="${x}" cy="${y}" r="${r}" style="fill:${c}" stroke="var(--surface)" stroke-width="2"/><text x="${x}" y="${y}">${i+1}</text></g>`});
    g+=`<g opacity="${op}">${lines}${mk}</g>`;
  }
  if(S.mapMode!=='focus'){const seen={};un.forEach(j=>{seen[j.locationId]=(seen[j.locationId]||0)+1});
    for(const lid in seen){const l=LOC[lid];if(!l)continue;const[x,y]=P(+l.lat,+l.lng);const cu=CUS[l.customerId]||{};g+=`<g class="mk mk-un"><title>Niet gepland: ${esc(cu.name)} – ${seen[lid]} voertuig(en)</title><circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y}">!</text></g>`}}
  g+=`<text class="note" x="12" y="${H-12}">Schematische kaart · lijnen hemelsbreed · ${useORS()?'reistijd via OpenRouteService':'reistijd berekend met wegfactor'}</text>`;
  const b=(k,l)=>`<button data-act="mapmode" data-k="${k}" aria-pressed="${S.mapMode===k}">${l}</button>`;
  return`<section class="panel"><div class="row"><h2>Routekaart</h2><span class="sp"></span></div><div class="map-ctl"><div class="seg">${b('routes','Alle routes')}${b('focus','Alleen geselecteerd')}${b('nl','Heel Nederland')}</div></div><div class="map-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kaart met routes per medewerker">${g}</svg></div></section>`;
}
function routePanel(st){
  const{rows,sims,P,date}=st,w=WRK[S.wid];
  const chips=`<div class="wsel" role="group" aria-label="Kies medewerker">${rows.map(x=>`<button data-act="selw" data-wid="${x.id}" aria-pressed="${x.id===S.wid}"><i class="dot" style="background:${wc(x)}"></i>${esc(x.name)}</button>`).join('')}</div>`;
  if(!w)return`<section class="panel">${chips}<p class="muted">Geen medewerkers beschikbaar.</p></section>`;
  const s=sims[w.id],c=wc(w),why=availWhy(w,date);
  const others=rows.filter(x=>x.id!==w.id);
  const moveSel=ids=>`<select class="mini" data-act="moveto" data-ids="${ids.join(',')}" aria-label="Verplaats naar medewerker"><option value="">Verplaats naar…</option>${others.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}<option value="__un">Uit planning halen</option></select>`;
  let li=`<li><time>${m2t(s.depart)}</time><div class="ev"><span class="lbl">Vertrek standplaats</span>${s.depart<s.start-.5?` <span class="chip">aanrijden voor werktijd</span>`:''} <span class="sub">${esc(w.postcode)} ${esc(w.city)}</span></div></li>`;
  let pendingWait=0,stopIdx=0;const seenStop=new Set();
  for(const g of s.seg){
    if(g.k==='drive')li+=`<li class="leg-li" style="--c:${c}"><span></span><div class="lbl">${fdur(g.b-g.a)} rijden incl. parkeren · ${fkm(g.km)}</div></li>`;
    else if(g.k==='wait')pendingWait+=g.b-g.a;
    else if(g.k==='pause')li+=`<li class="pause-li"><time>${m2t(g.a)}</time><div class="ev"><span class="lbl">Pauze ${fdur(g.b-g.a)}</span></div></li>`;
    else if(g.k==='return')li+=`<li class="leg-li" style="--c:${c}"><span></span><div class="lbl">${fdur(g.b-g.a)} terugrit · ${fkm(g.km)}</div></li>`;
    else if(g.k==='job'){
      const p=s.stops.find(x=>x.jobs.includes(g.id));if(!p||seenStop.has(p))continue;seenStop.add(p);stopIdx++;
      const cu=CUS[p.loc.customerId]||{},l=p.loc,pinned=p.jobs.every(id=>P.pinned[id]===w.id);
      const wins=[...new Set(p.jobs.map(id=>{const j=JOB[id];return j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:''}).filter(Boolean))];
      const jobsLi=p.jobs.map(id=>{const j=JOB[id];const sg=s.seg.find(x=>x.k==='job'&&x.id===id);return`<li draggable="true" data-drag="${id}">${plateBtn(j)}<span>${esc(j.vehicle||'')}</span><span class="muted">${esc((TYP[j.type]||{}).name||j.type)} · ${jobDur(j)} min</span><span class="mono${sg&&sg.late?' late':''}">${m2t(sg.a)}–${m2t(sg.b)}${sg&&sg.late?' te laat':''}</span>${+j.priority===3?'<span class="chip warn">Hoge prio</span>':''}${stChip(id,date)}<span class="sp"></span><button class="iconbtn" data-act="chat" data-id="${id}" title="Herplan met AI" aria-label="Herplan ${esc(j.plate)} met AI">${I.auto}</button>${moveSel([id])}</li>`}).join('');
      li+=`<li><time>${m2t(p.arrive)}</time><div class="stop${S.selLoc===l.id?' sel':''}" style="--c:${c}" draggable="true" data-drag="${p.jobs.join(',')}" data-drop="before:${w.id}:${p.jobs[0]}" data-act="sel" data-wid="${w.id}" data-loc="${l.id}">
        <div class="stop-top"><span class="num">${stopIdx}</span><b>${esc(cu.name||'Onbekende klant')}</b><span class="chip">${p.jobs.length} ${p.jobs.length===1?'auto':"auto's"}</span>${p.late?'<span class="chip bad">Buiten tijdvenster</span>':''}${pinned?`<span class="chip acc">${I.pin} vast</span>`:''}${SERVER&&p.jobs.every(id=>(stMap(date)[id]||{}).st==='done')?'<span class="chip ok">Afgerond</span>':''}</div>
        <div class="sub">${esc([l.address,[l.postcode,l.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${wins.length?' · venster '+wins.join(', '):' · hele dag'}${cu.contact?' · '+esc(cu.contact):''}${cu.login?' · inlog '+esc(cu.login):''}</div>${cu.notes?`<div class="sub" style="color:var(--ink)"><b>Klant:</b> ${esc(cu.notes)}</div>`:''}${l.info?`<div class="sub" style="color:var(--ink)"><b>Locatie-info:</b> ${esc(l.info)}</div>`:''}
        <div class="sub mono">Aankomst ${m2t(p.arrive)}${pendingWait?` · wacht ${fdur(pendingWait)} op venster`:''} · reinigen ${m2t(p.start)}–${m2t(p.end)} (${fdur(p.end-p.start)}) · vertrek ${m2t(p.end)}</div>
        <ul class="jobs">${jobsLi}</ul>
        <div class="stop-act"><button class="iconbtn" data-act="mv" data-dir="-1" data-wid="${w.id}" data-ids="${p.jobs.join(',')}" aria-label="Bezoek eerder" title="Bezoek eerder">${I.up}</button><button class="iconbtn" data-act="mv" data-dir="1" data-wid="${w.id}" data-ids="${p.jobs.join(',')}" aria-label="Bezoek later" title="Bezoek later">${I.down}</button><button class="iconbtn${pinned?' on':''}" data-act="pin" data-wid="${w.id}" data-ids="${p.jobs.join(',')}" aria-label="${pinned?'Losmaken':'Vastzetten bij deze medewerker'}" title="${pinned?'Losmaken':'Vastzetten bij deze medewerker'}">${I.pin}</button>${moveSel(p.jobs)}<button class="btn sm" data-act="visit" data-wid="${w.id}" data-loc="${l.id}">Details</button></div>
      </div></li>`;pendingWait=0;
    }
  }
  if(s.stops.length)li+=`<li><time>${m2t(s.finish)}</time><div class="ev"><span class="lbl">Terug op standplaats</span>${s.over>.5?` <span class="chip bad">${fdur(s.over)} na einde werktijd</span>`:''}</div></li>`;
  else li=`<li><span></span><p class="muted">Nog geen opdrachten. Sleep een blok of niet-ingeplande opdracht hierheen.</p></li>`;
  li+=`<li><span></span><div class="rt-end" data-drop="end:${w.id}">Sleep hierheen om achteraan de rit toe te voegen</div></li>`;
  const util=s.n?Math.round(s.serv/Math.max(1,s.end-s.start)*100):0;
  return`<section class="panel">${chips}
  <div class="rt-head"><div class="row"><h2>Rit ${esc(w.name)}</h2><span class="sp"></span>${sickBtns(w,S.date)}<button class="btn sm" data-act="ovr" data-wid="${w.id}">${I.edit} Werktijd deze dag</button><button class="btn sm" data-act="seqopt" data-wid="${w.id}">${I.route} Volgorde optimaliseren</button></div>
  <div class="sub">Standplaats ${esc(w.postcode)} ${esc(w.city)} · werktijd ${esc(shiftOf(w,date).start)}–${esc(shiftOf(w,date).end)}${ovr(w,date)?` <span class="chip warn">Afwijkend vandaag${ovr(w,date).note?': '+esc(ovr(w,date).note):''} · normaal ${esc(w.start)}–${esc(w.end)}</span>`:''}${(w.skills||[]).length?' · '+esc(w.skills.join(', ')):''}${why?` · <b style="color:var(--bad)">${esc(why)}</b>`:''}</div>
  <dl class="stats"><div><dt>Vertrek</dt><dd>${m2t(s.depart)}</dd></div><div><dt>Terug</dt><dd>${m2t(s.finish)}</dd></div><div><dt>Voertuigen</dt><dd>${s.n}</dd></div><div><dt>Rijtijd</dt><dd>${fdur(s.trav)}</dd></div><div><dt>Afstand</dt><dd>${fkm(s.km)}</dd></div><div><dt>Benutting</dt><dd>${util}%</dd></div></dl></div>
  <ol class="rt">${li}</ol></section>`;
}
function unplannedPanel(st){
  const{un,rows,date}=st;
  if(!un.length)return`<section class="panel"><h2>Niet ingepland</h2><div class="un-zone" data-drop="un"><div class="ok-line">Alle voertuigen van deze dag zijn ingepland. Sleep een bezoek hierheen om het uit de planning te halen.</div></div></section>`;
  const groups={};un.forEach(j=>(groups[j.locationId]=groups[j.locationId]||[]).push(j));
  const cards=Object.entries(groups).map(([lid,js])=>{const l=LOC[lid]||{},cu=CUS[l.customerId]||{},ids=js.map(j=>j.id);
    const reasons=[...new Set(js.map(j=>whyUnplanned(j,date)))];
    return`<div class="uncard" draggable="true" data-drag="${ids.join(',')}"><div class="stop-top"><b style="font:600 16px var(--f-disp)">${esc(cu.name)}</b><span class="chip">${js.length} ${js.length===1?'auto':"auto's"}</span></div>
    <div class="sub">${esc(l.postcode)} ${esc(l.city)} · ${js.map(j=>`${esc((TYP[j.type]||{}).name||j.type)}${j.from||j.to?` ${esc(j.from||'')}–${esc(j.to||'')}`:''}`).filter((x,i,a)=>a.indexOf(x)===i).join(', ')}</div>
    <div class="row">${js.map(j=>plateBtn(j)).join(' ')}</div>
    <div class="small" style="color:var(--warn)">${reasons.map(esc).join(' · ')}</div>
    <div class="row"><button class="btn sm" data-act="propose" data-ids="${ids.join(',')}">${I.auto} Slim voorstel</button><select class="mini" data-act="moveto" data-ids="${ids.join(',')}" aria-label="Inplannen bij"><option value="">Inplannen bij…</option><option value="__best">Beste medewerker (automatisch)</option>${rows.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div></div>`}).join('');
  return`<section class="panel"><div class="row"><h2>Niet ingepland</h2><span class="chip warn">${un.length} ${un.length===1?'voertuig':'voertuigen'}</span><span class="sp"></span><span class="small muted">Sleep naar een medewerker in de dagplanning of kies hieronder. Handmatig inplannen mag ook als het niet past; de app toont dan de overschrijding.</span></div><div class="un-zone" data-drop="un">${cards}</div></section>`;
}

/* ---------- beheer: opdrachten ---------- */
function jobStatus(j){
  const P=D.plans[j.date];if(!P||!P.routes)return'<span class="chip">Nog niet gepland</span>';
  for(const wid in P.routes){const r=P.routes[wid];if(r.includes(j.id)&&WRK[wid]){const s=simulate(WRK[wid],r);const g=s.seg.find(x=>x.k==='job'&&x.id===j.id);return`<span class="chip ${g&&g.late?'bad':'ok'}"><i class="dot" style="background:${wc(WRK[wid])}"></i>${esc(WRK[wid].name.split(' ')[0])} ${g?m2t(g.a):''}</span>${stChip(j.id,j.date)?'<div style="margin-top:4px">'+stChip(j.id,j.date)+'</div>':''}${g&&g.late?`<div style="margin-top:6px"><button class="btn sm" data-act="propose" data-ids="${j.id}">${I.auto} Slim voorstel</button></div>`:''}`}}
  return`<span class="chip warn">Niet ingepland</span><div class="small" style="color:var(--warn);max-width:34ch;margin-top:4px">${esc(whyUnplanned(j,j.date))}</div><div style="margin-top:6px"><button class="btn sm" data-act="propose" data-ids="${j.id}">${I.auto} Slim voorstel</button></div>`;
}
function locLabel(l){const c=CUS[l.customerId]||{};return`${c.name||'?'} — ${l.name} (${l.postcode} ${l.city})`}
const normPlate=s=>String(s||'').replace(/[^0-9a-z]/gi,'').toUpperCase();
function jobMatches(j,q){
  if(!q)return true;const l=LOC[j.locationId]||{},c=CUS[l.customerId]||{};
  const p=normPlate(q);if(p&&normPlate(j.plate).includes(p))return true;
  const t=q.toLowerCase();return[c.name,l.city,l.postcode,l.address,j.vehicle].some(x=>String(x||'').toLowerCase().includes(t));
}
function viewJobs(){
  const q=S.jobQ||'';
  return`<section class="panel"><div class="toolbar"><h2>Reinigingsopdrachten</h2><label class="search"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/></g></svg><input type="search" id="jobQ" value="${esc(q)}" placeholder="Zoek op kenteken, klant of plaats" aria-label="Zoek op kenteken, klant of plaats" autocomplete="off"></label><span class="sp"></span><div class="seg"><button data-act="jobscope" data-k="dag" aria-pressed="${S.jobScope==='dag'}">${esc(fdate(S.date,{day:'numeric',month:'short'}))}</button><button data-act="jobscope" data-k="alle" aria-pressed="${S.jobScope==='alle'}">Alle datums</button></div>${importLogs().length?`<button class="btn" data-act="openlog">Importlog</button>`:''}<button class="btn" data-act="import">${I.imp} Importeren uit Excel</button><button class="btn primary" data-act="newjob">${I.plus} Nieuwe opdracht</button></div>
  ${jobFilterBar()}
  <div id="jobsTbl">${jobsTable()}</div></section>`;
}
const JF0={from:'',to:'',wid:'',cust:'',type:'',st:'',prio:'',sort:'date'};
const jf=()=>S.jf||(S.jf={...JF0});
let JPI=null;
function jobPlanInfo(j){
  const key=j.id;if(JPI&&JPI[key])return JPI[key];
  const P=D.plans[j.date];let r={st:'none',wid:'',start:null};
  if(P&&P.routes){r.st='unplanned';for(const wid in P.routes){const rt=P.routes[wid];if(rt.includes(j.id)&&WRK[wid]){const sim=simulate(WRK[wid],rt,j.date);
    for(const id of rt){const g=sim.seg.find(x=>x.k==='job'&&x.id===id);if(JPI)JPI[id]={st:g&&g.late?'late':'planned',wid,start:g?g.a:null}}
    r=(JPI&&JPI[key])||(()=>{const g=sim.seg.find(x=>x.k==='job'&&x.id===j.id);return{st:g&&g.late?'late':'planned',wid,start:g?g.a:null}})();break}}}
  if(JPI)JPI[key]=r;return r;
}
const jobPlanSt=j=>jobPlanInfo(j).st;
function jobFilterBar(){
  const f=jf(),sel=(k,opts,lab)=>`<label class="jf"><span>${lab}</span><select class="mini" data-jf="${k}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(f[k])===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  const custs=[...new Set(D.customers.map(c=>c.name))].sort((a,b)=>a.localeCompare(b,'nl'));
  const active=Object.keys(JF0).some(k=>k!=='sort'&&f[k]);
  return`<div class="jfbar"><label class="jf"><span>Van</span><input type="date" class="mini" data-jf="from" value="${esc(f.from)}"></label><label class="jf"><span>Tot en met</span><input type="date" class="mini" data-jf="to" value="${esc(f.to)}"></label>
    ${sel('wid',[['','Alle medewerkers'],...D.workers.map(w=>[w.id,w.name]),['__none','Niet ingepland']],'Medewerker')}${sel('cust',[['','Alle klanten'],...custs.map(c=>[c,c])],'Klant')}${sel('type',[['','Alle types'],...D.types.map(t=>[t.id,t.name])],'Type')}
    ${sel('st',[['','Alle'],['planned','Ingepland'],['late','Buiten tijdvak'],['unplanned','Niet ingepland'],['none','Nog niet gepland']],'Planning')}${sel('prio',[['','Alle'],['3','Hoog'],['2','Normaal'],['1','Laag']],'Prioriteit')}
    ${sel('sort',[['date','Datum oplopend'],['date-','Datum aflopend'],['wrk','Datum, medewerker, rit'],['cust','Klant'],['city','Plaats'],['plate','Kenteken']],'Sorteren')}
    ${active?`<button class="btn sm ghost" data-act="jfclear">Filters wissen</button>`:''}</div>`;
}
function jobsTable(){
  const q=(S.jobQ||'').trim(),f=jf();JPI={};
  const cityOf=j=>LOC[j.locationId]?.city||'',custOf=j=>CUS[(LOC[j.locationId]||{}).customerId]?.name||'';
  const pst=j=>{const i=jobPlanInfo(j);return i.start!=null?i.start:(j.from?t2m(j.from):9999)};
  const wname=j=>{const w=WRK[jobPlanInfo(j).wid];return w?w.name:'\uffff'};
  const byDate=(a,b)=>a.date.localeCompare(b.date)||pst(a)-pst(b)||cityOf(a).localeCompare(cityOf(b));
  const cmp={date:byDate,'date-':(a,b)=>-byDate(a,b),cust:(a,b)=>custOf(a).localeCompare(custOf(b),'nl')||byDate(a,b),city:(a,b)=>cityOf(a).localeCompare(cityOf(b),'nl')||byDate(a,b),plate:(a,b)=>a.plate.localeCompare(b.plate)||byDate(a,b),wrk:(a,b)=>a.date.localeCompare(b.date)||wname(a).localeCompare(wname(b),'nl')||pst(a)-pst(b)}[f.sort]||byDate;
  const wide=q||S.jobScope!=='dag'||f.from||f.to;
  const list=(wide?[...D.jobs]:jobsOn(S.date)).filter(j=>jobMatches(j,q)&&(!f.from||j.date>=f.from)&&(!f.to||j.date<=f.to)&&(!f.cust||custOf(j)===f.cust)&&(!f.type||j.type===f.type)&&(!f.prio||String(j.priority||2)===f.prio)&&(!f.st||jobPlanSt(j)===f.st)&&(!f.wid||(f.wid==='__none'?!WRK[jobPlanInfo(j).wid]:jobPlanInfo(j).wid===f.wid))).sort(cmp);
  const pr={1:'Laag',2:'Normaal',3:'Hoog'};
  const grpKey=j=>f.sort==='wrk'?j.date+'|'+(jobPlanInfo(j).wid||''):(f.sort==='date'||f.sort==='date-')?j.date:null;
  const cnt={};list.forEach(j=>{const k=grpKey(j);if(k!=null)cnt[k]=(cnt[k]||0)+1});
  const grpH=j=>{const w=WRK[jobPlanInfo(j).wid];return`<tr class="grp"><td colspan="9"><b>${esc(fdate(j.date,{weekday:'long',day:'numeric',month:'long'}))}</b>${f.sort==='wrk'?` \u00b7 ${w?`<i class="dot" style="background:${wc(w)}"></i> ${esc(w.name)}`:'<span style="color:var(--warn)">Niet ingepland</span>'}`:''}<span class="muted"> \u00b7 ${cnt[grpKey(j)]} ${cnt[grpKey(j)]===1?'auto':'auto\u2019s'}</span>${f.sort==='wrk'&&w?` <button class="btn sm ghost" data-act="jfgoto" data-date="${j.date}" data-wid="${w.id}">Naar rit</button>`:''}</td></tr>`};
  let prevG=null;
  const rowsH=list.map(j=>{const gk=grpKey(j),gh=gk!=null&&gk!==prevG?grpH(j):'';prevG=gk;const l=LOC[j.locationId]||{},c=CUS[l.customerId]||{};return gh+`<tr><td>${plateHtml(j.plate)}<div class="small muted">${esc(j.vehicle)}</div></td><td><b>${esc(c.name)}</b><div class="small muted">${esc(l.name)} · ${esc(l.postcode)} ${esc(l.city)}</div></td><td class="mono">${esc(fdate(j.date,{weekday:'short',day:'numeric',month:'short'}))}</td><td class="mono">${j.from||j.to?esc((j.from||'—')+'–'+(j.to||'—')):'<span class="muted">hele dag</span>'}</td><td>${esc((TYP[j.type]||{}).name||j.type)}</td><td class="mono">${jobDur(j)} min</td><td>${+j.priority===3?'<span class="chip warn">Hoog</span>':pr[j.priority]||'Normaal'}</td><td>${jobStatus(j)}</td><td class="act"><button class="btn ghost" data-act="chat" data-id="${j.id}" title="Herplan met AI" aria-label="Herplan met AI">${I.auto}</button><button class="btn ghost" data-act="editjob" data-id="${j.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`}).join('');
  return`${list.length?`<div class="tbl-wrap"><table><thead><tr><th>Kenteken</th><th>Klant · locatie</th><th>Datum</th><th>Venster</th><th>Type</th><th>Duur</th><th>Prioriteit</th><th>Planning</th><th></th></tr></thead><tbody>${rowsH}</tbody></table></div>`:`<p class="empty">${q?`Geen opdrachten gevonden voor "${esc(q)}".`:'Geen opdrachten voor deze selectie.'}</p>`}
  <p class="hint">${list.length} opdracht(en)${q?' gevonden over alle datums':''}. Na een wijziging in opdrachten plant de app die dag opnieuw automatisch; handmatig vastgezette bezoeken blijven bij dezelfde medewerker.</p>`;
}
function jobFields(){
  return[{k:'plate',label:'Kenteken',req:1,ph:'AB-123-C'},{k:'vehicle',label:'Voertuig',ph:'Merk en model'},
    {k:'locationId',label:'Klant en locatie',type:'combo',req:1,ph:'Zoek op klant, plaats, postcode of adres',options:D.locations.map(l=>{const c=CUS[l.customerId]||{};const sub=[l.name,l.address,[l.postcode,l.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');return{v:l.id,label:locLabel(l),title:c.name||'?',sub,hay:normTxt([c.name,l.name,l.address,l.postcode,String(l.postcode||'').replace(/\s/g,''),l.city,c.contact].join(' '))}}).sort((a,b)=>a.title.localeCompare(b.title))},
    {k:'date',label:'Gewenste datum',type:'date',req:1},{k:'type',label:'Type reiniging',type:'select',options:D.types.map(t=>[t.id,`${t.name} (${t.dur} min)`])},
    {k:'from',label:'Vanaf (optioneel)',type:'time'},{k:'to',label:'Uiterlijk gereed (optioneel)',type:'time'},
    {k:'duration',label:'Afwijkende duur (min)',type:'number',ph:'standaard per type'},{k:'priority',label:'Prioriteit',type:'select',options:[[1,'Laag'],[2,'Normaal'],[3,'Hoog']]},
    {k:'notes',label:'Opmerking',wide:1}];
}
function editJob(id,preset){
  if(!D.locations.length){toast('Voeg eerst een klant met locatie toe.');S.tab='klanten';render();return}
  const pl=preset&&preset._place,j=id?JOB[id]:{plate:'',vehicle:'',locationId:(preset&&preset.locationId)||D.locations[0].id,date:S.date,type:D.types[0]?.id,from:(preset&&preset.from)||'',to:'',duration:'',priority:2,notes:''};
  const old=id?j.date:null;
  openForm({title:id?'Opdracht '+j.plate:pl&&WRK[pl.wid]?'Nieuwe afspraak voor '+WRK[pl.wid].name:'Nieuwe opdracht',note:id?jobPlanNote(j):pl&&WRK[pl.wid]?`Wordt ingepland bij ${WRK[pl.wid].name}${pl.at!=null?' rond '+m2t(pl.at):' op de beste plek in de rit'} en vastgezet. Pas het tijdvak aan als de klant een andere tijd wil.`:'',fields:jobFields(),values:j,
    onSave:v=>{if(v.from&&v.to&&t2m(v.to)<=t2m(v.from))return'"Uiterlijk gereed" moet later zijn dan "Vanaf".';
      if(id){Object.assign(j,v);replan([v.date,old]);toast('Opdracht opgeslagen, planning herberekend.');return}
      const nj={id:uid('j'),...v};D.jobs.push(nj);index();
      if(pl&&WRK[pl.wid]){if(t2m(v.from)!=null)pl.at=t2m(v.from);if(!hasPlan(v.date)&&jobsOn(v.date).length>1)autoPlan(v.date);const nm=placeNewJob(nj,pl);replan([v.date]);const st=jobPlanInfo(nj);toast(`Afspraak ${nj.plate} ingepland bij ${nm}${st.start!=null?' om '+m2t(st.start):''} en vastgezet${st.st==='late'?'. Let op: valt buiten het tijdvak of de werktijd':''}.`);return}
      replan([v.date]);toast('Opdracht toegevoegd en ingepland.')},
    onDelete:id?()=>{D.jobs=D.jobs.filter(x=>x.id!==id);replan([old]);toast('Opdracht verwijderd.')}:null});
}
function replan(dates){index();for(const d of new Set(dates.filter(Boolean))){if(D.plans[d]&&D.plans[d].edited)cleanPlan(d);else if(jobsOn(d).length||D.plans[d])autoPlan(d)}save();render()}
/* ---------- rechtermuisknop op het planbord ---------- */
function closeCtx(){const c=$('#ctx');if(c)c.remove()}
function openCtx(x,y,html,title){
  closeCtx();const m=document.createElement('div');m.id='ctx';m.setAttribute('role','menu');m.innerHTML=(title?`<div class="ctx-t">${title}</div>`:'')+html;document.body.appendChild(m);
  const r=m.getBoundingClientRect(),W=innerWidth,H=innerHeight;m.style.left=Math.max(8,Math.min(x,W-r.width-8))+'px';m.style.top=Math.max(8,Math.min(y,H-r.height-8))+'px';
  const f=m.querySelector('button');if(f)f.focus({preventScroll:true});
}
const ctxBtn=(act,lab,attrs='',sub='')=>`<button role="menuitem" data-act="${act}" ${attrs}><span>${lab}</span>${sub?`<small>${sub}</small>`:''}</button>`;
function onContext(e){
  if(S.tab!=='planning')return;
  const blk=e.target.closest('.blk.job'),track=e.target.closest('.tl-track'),who=e.target.closest('.tl-who');
  if(!blk&&!track&&!who)return;
  e.preventDefault();
  if(blk){
    const wid=blk.dataset.wid,lid=blk.dataset.loc,ids=blk.dataset.drag.split(','),w=WRK[wid],l=LOC[lid]||{},cu=CUS[l.customerId]||{},P=getPlan(S.date),pinned=ids.every(id=>P.pinned[id]===wid);
    const others=D.workers.filter(x=>x.id!==wid&&avail(x,S.date));
    const sim=simulate(w,P.routes[wid]||[],S.date),stop=sim.stops.find(p=>p.loc.id===lid);
    openCtx(e.clientX,e.clientY,
      ctxBtn('visit','Details van dit bezoek',`data-wid="${wid}" data-loc="${lid}"`)+
      ctxBtn('ctxnew',`${I.plus} Nieuwe afspraak op deze locatie`,`data-wid="${wid}" data-loc="${lid}" data-t="${stop?Math.round(stop.end):''}"`,`bij ${esc(w.name.split(' ')[0])}, aansluitend`)+
      ctxBtn('chat',`${I.auto} Herplan met AI`,`data-id="${ids[0]}"`,ids.length>1?`${ids.length} auto's, begint bij ${esc(JOB[ids[0]].plate)}`:esc(JOB[ids[0]].plate))+
      ctxBtn('pin',pinned?'Losmaken':'Vastzetten bij '+esc(w.name.split(' ')[0]),`data-wid="${wid}" data-ids="${ids.join(',')}"`)+
      `<div class="ctx-sep"></div><div class="ctx-t">Verplaatsen naar</div>`+others.map(o=>ctxBtn('ctxmove',`<i class="dot" style="background:${wc(o)}"></i> ${esc(o.name)}`,`data-wid="${o.id}" data-ids="${ids.join(',')}"`)).join('')+
      ctxBtn('ctxmove','Uit de planning halen',`data-wid="" data-ids="${ids.join(',')}"`),
      `${esc(cu.name||'Bezoek')} · ${ids.length} ${ids.length===1?'auto':"auto's"}`);
    return;
  }
  const row=e.target.closest('.tl-row'),tr=row&&row.querySelector('.tl-track'),wid=(tr&&tr.dataset.wid)||(who&&who.dataset.wid);const w=WRK[wid];if(!w)return;
  let t=null;
  if(track){const r=track.getBoundingClientRect(),rs=+track.dataset.rs,re=+track.dataset.re;t=Math.round((rs+(e.clientX-r.left)/r.width*(re-rs))/15)*15}
  const first=w.name.split(' ')[0];
  openCtx(e.clientX,e.clientY,
    (t!=null?ctxBtn('ctxnew',`${I.plus} Nieuwe afspraak om ${m2t(t)}`,`data-wid="${wid}" data-t="${t}"`,`bij ${esc(first)}, vastgezet`):'')+
    ctxBtn('ctxnew',`${I.plus} Nieuwe afspraak op een ander tijdstip`,`data-wid="${wid}" data-t=""`,`bij ${esc(first)}, zelf de tijd invullen`)+
    ctxBtn('ctxnew',`${I.plus} Nieuwe afspraak voor ${esc(first)}`,`data-wid="${wid}"`,'op de beste plek in de rit')+
    ctxBtn('newjob',`${I.plus} Nieuwe afspraak, automatisch plannen`,'','de app kiest de medewerker')+
    `<div class="ctx-sep"></div>`+
    ctxBtn('selw','Rit bekijken',`data-wid="${wid}"`)+
    ctxBtn('ovr','Werktijd deze dag',`data-wid="${wid}"`)+
    ctxBtn('sick','Ziek melden',`data-id="${wid}"`)+
    ctxBtn('msgs',`${I.chat} Bericht sturen`,`data-wid="${wid}"`),
    `${esc(w.name)} · ${esc(fdate(S.date,{weekday:'short',day:'numeric',month:'short'}))}`);
}
/* nieuwe opdracht direct bij een medewerker, op een tijdstip of op de beste plek */
function newJobAt(wid,t,lid){
  const pre={wid,at:t!=null&&t!==''?+t:null};
  editJob(null,{locationId:lid||undefined,from:pre.at!=null?m2t(pre.at):'',_place:pre});
}
function placeNewJob(j,pre){
  const P=getPlan(j.date),w=WRK[pre.wid];if(!w)return'';
  for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>id!==j.id);
  const r=P.routes[pre.wid]=P.routes[pre.wid]||[];
  if(pre.at!=null){const sim=simulate(w,r,j.date);const nxt=r.find(id=>{const g=sim.seg.find(x=>x.k==='job'&&x.id===id);return g&&g.a>=pre.at-1});const i=nxt?r.indexOf(nxt):r.length;r.splice(i,0,j.id)}
  else{const b=bestPos(w,r,[j.id],true)||bestPos(w,r,[j.id],false);P.routes[pre.wid]=b?b.arr:r.concat(j.id)}
  P.pinned[j.id]=pre.wid;P.edited=Date.now();if(!P.auto)P.auto=Date.now();
  return w.name;
}

/* ---------- AI-chat per kenteken: verzoek in gewone taal -> zoekcriteria -> doorgerekende opties -> toepassen ---------- */
let CHAT=null;
function jobWhere(id){const j=JOB[id];if(!j)return null;const P=D.plans[j.date];let wid=null;if(P&&P.routes)for(const k in P.routes)if(P.routes[k].includes(id))wid=k;
  let g=null;if(wid&&WRK[wid]){const s=simulate(WRK[wid],P.routes[wid],j.date);g=s.seg.find(x=>x.k==='job'&&x.id===id)}return{wid,start:g?g.a:null,end:g?g.b:null}}
function nextMonday(d){const w=wday(d);return addDays(d,((8-w)%7)||7)}
function searchOptions(ids,crit){
  const js=ids.map(id=>JOB[id]).filter(Boolean);if(!js.length)return[];
  const saved=js.map(j=>[j.date,j.from,j.to]),today=todayIso(),kw=D.settings.kmWeight||0,out=[];
  const from=crit.van<today?today:crit.van,to=crit.tot<from?from:crit.tot;
  const want=crit.mode==='zelfde'?t2m(saved[0][1]):crit.mode==='tijd'?t2m(crit.tFrom):null;
  const cur=jobWhere(ids[0])||{};
  try{
    for(let d=from,n=0;d<=to&&n<31;d=addDays(d,1),n++){
      js.forEach((j,i)=>{j.date=saved[i][0]});
      if(jobsOn(d).length&&!hasPlan(d))autoPlan(d);
      const P=D.plans[d]||{routes:{}};
      js.forEach((j,i)=>{j.date=d;if(crit.mode==='zelfde'){j.from=saved[i][1];j.to=saved[i][2]}else if(crit.mode==='vrij'){j.from='';j.to=''}else{j.from=crit.tFrom;j.to=crit.tTo}});
      if(d===today){const nw=new Date(),earliest=Math.ceil((nw.getHours()*60+nw.getMinutes()+30)/15)*15;js.forEach(j=>{const f=t2m(j.from);if(f==null||f<earliest)j.from=m2t(Math.min(earliest,1439))})}
      for(const w of D.workers){
        if(!avail(w,d)||(crit.wids&&crit.wids.length&&!crit.wids.includes(w.id))||js.some(j=>!skillOk(w,j)))continue;
        const r=((P.routes||{})[w.id]||[]).filter(id=>!ids.includes(id)),base=simulate(w,r,d),mine=[];
        const j0=js[0],f0=j0.from,wf=t2m(j0.from)??t2m(shiftOf(w,d).start)??480,wt=t2m(j0.to)??t2m(shiftOf(w,d).end)??1020,dur=js.reduce((a,j)=>a+jobDur(j),0),starts=[null];
        for(let s0=Math.ceil((wf+60)/60)*60;s0+dur<=wt&&starts.length<6;s0+=60)starts.push(s0);
        for(const s0 of starts)for(let p=0;p<=r.length;p++){
          j0.from=s0==null?f0:m2t(s0);
          const arr=r.slice(0,p).concat(ids,r.slice(p)),sm=simulate(w,arr,d);if(!feas(sm))continue;
          const g=sm.seg.filter(x=>x.k==='job'&&ids.includes(x.id)),m={};g.forEach(x=>m[x.id]=[x.a,x.b]);
          const st=Math.min(...g.map(x=>x.a)),en=Math.max(...g.map(x=>x.b)),dd=Math.round((new Date(d+'T12:00:00')-new Date(from+'T12:00:00'))/864e5);
          if(d===saved[0][0]&&cur.wid===w.id&&Math.abs(st-(cur.start??-999))<1)continue;
          if(mine.some(c=>Math.abs(c.start-st)<10))continue;
          mine.push({kind:'search',date:d,wid:w.id,start:st,end:en,segs:m,dtrav:sm.trav-base.trav,dkm:sm.km-base.km,setWin:crit.mode!=='zelfde',dev:0,
            score:(sm.trav-base.trav)+kw*(sm.km-base.km)+dd*15+(want!=null?Math.abs(st-want)*.3:0)});
        }
        j0.from=f0;mine.sort((a,b)=>a.score-b.score);out.push(...mine.slice(0,(crit.wids&&crit.wids.length)?5:2));
      }
    }
  }finally{js.forEach((j,i)=>{j.date=saved[i][0];j.from=saved[i][1];j.to=saved[i][2]})}
  out.sort((a,b)=>a.score-b.score);const per={},lim=(crit.wids&&crit.wids.length)||crit.van===crit.tot?5:2;const res=out.filter(c=>(per[c.date]=(per[c.date]||0)+1)<=lim).slice(0,6);if(res.length)res[0].best=true;
  return res.sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
}
const QUICK=['Vandaag','Morgen','Volgende week','Zelfde tijd volgende week'];
function localParse(text,C){const t=normTxt(text),today=todayIso();
  if(t==='vandaag')return{van:today,tot:today,mode:'vrij',reply:'Ik zoek vandaag nog een plek, op elk tijdstip.'};
  if(t==='morgen')return{van:addDays(today,1),tot:addDays(today,1),mode:'vrij',reply:'Ik zoek morgen een plek, op elk tijdstip.'};
  if(t==='volgende week'){const m=nextMonday(today);return{van:m,tot:addDays(m,4),mode:'zelfde',reply:'Ik zoek volgende week (maandag t/m vrijdag) een plek binnen hetzelfde tijdvak.'}}
  if(t==='zelfde tijd volgende week'){const d=addDays(C.date,7);return{van:d,tot:d,mode:'zelfde',reply:`Ik zoek op ${fdate(d,{weekday:'long',day:'numeric',month:'long'})} een plek binnen hetzelfde tijdvak.`}}
  return null;
}
async function aiParse(C,text){
  const mode=aiMode(),j=JOB[C.id],l=LOC[j.locationId]||{},cu=CUS[l.customerId]||{},wh=jobWhere(C.id)||{};
  const cal=[];for(let i=0;i<35;i++){const d=addDays(todayIso(),i);cal.push(`${fdate(d,{weekday:'long',day:'numeric',month:'long'})} = ${d}`)}
  const hist=C.turns.slice(-8).map(t=>(t.role==='user'?'Planner: ':'Assistent: ')+t.content).join('\n');
  const prompt=`Je helpt een planner van een autoreinigingsbedrijf om één afspraak te verplaatsen. Vertaal het verzoek naar zoekcriteria; de planningssoftware rekent daarna zelf de beste plekken door. Verzin zelf geen tijden of planning.

Vandaag is ${fdate(todayIso(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})} (${todayIso()}).
Afspraak: kenteken ${j.plate}, klant ${cu.name||'?'} in ${l.city||'?'}, ${jobDur(j)} minuten, nu op ${fdate(j.date,{weekday:'long',day:'numeric',month:'long'})} (${j.date})${wh.wid?` bij ${WRK[wh.wid].name} om ${m2t(wh.start)}`:', nog niet ingepland'}, tijdvak klant ${j.from||j.to?(j.from||'?')+'-'+(j.to||'?'):'hele dag'}.
Medewerkers: ${D.workers.map(w=>w.name).join(', ')}.
Kalender:
${cal.join('\n')}

Gesprek tot nu toe:
${hist}

Antwoord met alleen een JSON-object:
{"van":"JJJJ-MM-DD","tot":"JJJJ-MM-DD","medewerkers":["naam"],"tijdvak":"zelfde" of "vrij" of "HH:MM-HH:MM","antwoord":"<één korte zin over wat je zoekt>"}
Regels: "medewerkers" leeg laten als er geen medewerker genoemd wordt. "zelfde" = tijdvak van de klant houden (standaard bij een andere dag zonder tijdsaanduiding). "vrij" = elk tijdstip (bij "vandaag", "zo snel mogelijk", "maakt niet uit"). Een genoemde tijd of dagdeel wordt een tijdvak: ochtend 08:00-12:00, middag 12:00-17:00, "na 14 uur" 14:00-18:00, "om 10 uur" 10:00-11:00. "Volgende week" = maandag t/m vrijdag van volgende week. Een periode mag maximaal 21 dagen zijn. Is het verzoek echt onduidelijk, antwoord dan alleen {"vraag":"<korte wedervraag>"}.`;
  if(mode==='claude')return SAMPLE.json(prompt,{modelTier:'quick',cache:false,signal:AICTL.signal});
  const raw=await serverAI(prompt,AICTL.signal);const a=raw.indexOf('{'),b=raw.lastIndexOf('}');return JSON.parse(raw.slice(a,b+1));
}
function critFromAI(r){
  const ok=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');const today=todayIso();let van=ok(r.van)?r.van:today,tot=ok(r.tot)?r.tot:van;if(tot<van)tot=van;if((new Date(tot)-new Date(van))/864e5>21)tot=addDays(van,21);
  const wids=(r.medewerkers||[]).map(n=>{const q=normTxt(n);const w=D.workers.find(x=>normTxt(x.name)===q)||D.workers.find(x=>normTxt(x.name).split(' ')[0]===q.split(' ')[0]);return w&&w.id}).filter(Boolean);
  const tv=String(r.tijdvak||'zelfde'),m=/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/.exec(tv);
  return{van,tot,wids,mode:m?'tijd':tv==='vrij'?'vrij':'zelfde',tFrom:m?m2t(+m[1]*60+ +m[2]):'',tTo:m?m2t(+m[3]*60+ +m[4]):'',reply:String(r.antwoord||'')};
}
function openChat(id){
  const j=JOB[id];if(!j)return;const l=LOC[j.locationId]||{},cu=CUS[l.customerId]||{},wh=jobWhere(id)||{};
  if(!CHAT||CHAT.id!==id)CHAT={id,date:j.date,turns:[],msgs:[{role:'a',text:`Waar wil je ${j.plate} naartoe? Typ bijvoorbeeld "vandaag na 14 uur", "morgen bij Sanne" of "volgende week dinsdagochtend", of kies een snelkeuze.`}]};
  FORM=null;const mode=aiMode();
  $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="chT" style="width:min(680px,100%)">
    <div class="row"><h3 id="chT" style="margin:0">Herplannen met AI</h3><span class="sp"></span>${plateHtml(j.plate)}</div>
    <p class="note" style="margin:8px 0 10px">${esc(cu.name||'')}, ${esc(l.city||'')} · nu ${esc(fdate(j.date,{weekday:'short',day:'numeric',month:'short'}))}${wh.wid?` bij ${esc(WRK[wh.wid].name)} om ${m2t(wh.start)}`:' (niet ingepland)'} · tijdvak klant ${j.from||j.to?esc((j.from||'—')+'–'+(j.to||'—')):'hele dag'} · ${jobDur(j)} min</p>
    <div class="chat" id="chatLog" aria-live="polite"></div>
    <div class="row" style="margin:10px 0 8px">${QUICK.map(q=>`<button type="button" class="fchip" data-act="chatquick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form id="chatF" class="chatf"><input id="chatQ" type="text" autocomplete="off" placeholder="${mode?'Typ je verzoek, bijv. morgen ochtend bij Mark':'Vrije tekst werkt met AI; gebruik hier de snelkeuzes'}"${mode?'':' disabled'}><button class="btn primary" type="submit"${mode?'':' disabled'}>Verstuur</button><button class="btn ghost" type="button" data-act="aistop" id="chatStop" hidden>Stoppen</button></form>
    <div class="dlg-foot"><button class="btn sm" data-act="editjob" data-id="${id}">${I.edit} Opdracht wijzigen</button><span class="sp"></span><button type="button" class="btn" data-act="dlgx">Sluiten</button></div></div>`;
  $('#modal').hidden=false;renderChat();
  $('#chatF').addEventListener('submit',e=>{e.preventDefault();const q=$('#chatQ').value.trim();if(q){$('#chatQ').value='';chatSend(q)}});
  setTimeout(()=>{const q=$('#chatQ');if(q&&!q.disabled)q.focus()},30);
}
function renderChat(){
  const C=CHAT,log=$('#chatLog');if(!C||!log)return;
  log.innerHTML=C.msgs.map((m,mi)=>m.role==='u'?`<div class="msg-u">${esc(m.text)}</div>`
    :`<div class="msg-a">${m.busy?'<span class="muted">Even zoeken…</span>':esc(m.text)}${m.pw&&mi===C.msgs.length-1?`<form class="chatf" data-pwform="${mi}"><input type="password" id="chatPw" placeholder="App-wachtwoord" autocomplete="current-password"><button class="btn primary" type="submit">Opslaan en opnieuw</button></form>`:''}${m.cands&&m.cands.length?`<div class="chat-opts">${m.cands.map((c,ci)=>{const w=WRK[c.wid];
      return`<div class="prop${c.best?' rec':''}"><div class="prop-main"><div class="row"><b><i class="dot" style="background:${wc(w)}"></i> ${esc(w.name)}</b>${c.best?'<span class="chip ok">Beste optie</span>':''}</div>
        <div class="prop-t">${esc(fdate(c.date,{weekday:'short',day:'numeric',month:'short'}))} · ${m2t(c.start)}–${m2t(c.end)}</div><div class="small muted">+${fdur(Math.max(0,c.dtrav))} rijden · +${fkm(Math.max(0,c.dkm))}${c.setWin?' · tijdvak wordt aangepast':' · binnen tijdvak klant'}</div></div>
        <button class="btn sm${c.best?' primary':''}" data-act="chatapply" data-m="${mi}" data-i="${ci}">Toepassen</button></div>`}).join('')}</div>`:''}</div>`).join('');
  log.scrollTop=log.scrollHeight;
  const pf=log.querySelector('[data-pwform]');if(pf){const inp=pf.querySelector('input');setTimeout(()=>inp.focus(),20);
    pf.addEventListener('submit',e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;PWMEM=v;pwStore(v);
      const q=C.msgs[+pf.dataset.pwform].pw;C.msgs.splice(+pf.dataset.pwform-1,2);chatSend(q)})}
}
async function chatSend(text){
  const C=CHAT;if(!C||AICTL)return;C.msgs.push({role:'u',text});C.turns.push({role:'user',content:text});
  const reply={role:'a',text:'',busy:true};C.msgs.push(reply);renderChat();
  let crit=localParse(text,C);
  if(!crit){
    if(!aiMode()){reply.busy=false;reply.text='Vrije tekst werkt alleen met AI. Gebruik hier de snelkeuzes.';renderChat();return}
    AICTL=new AbortController();$('#chatStop').hidden=false;
    try{const r=await aiParse(C,text);if(r&&r.vraag){reply.busy=false;reply.text=String(r.vraag);C.turns.push({role:'assistant',content:reply.text});renderChat();return}crit=critFromAI(r||{})}
    catch(err){const e=err&&err.name==='AbortError'?{code:'cancelled'}:err instanceof SyntaxError?{code:'invalid_json'}:(err||{});
      if(e.code==='pw'){reply.busy=false;reply.pw=text;reply.text='Om AI te gebruiken heb ik het app-wachtwoord nodig (APP_PASSWORD uit Netlify). Vul het hieronder in; je verzoek wordt daarna direct opnieuw verstuurd.';C.turns.pop();renderChat();return}
      reply.busy=false;reply.text=e.code==='cancelled'?'Gestopt.':{not_granted:'Je hebt Claude niet toegestaan voor deze pagina.',rate_limited:'Even te veel verzoeken of je tegoed is op. Probeer het later opnieuw.',invalid_json:'Ik begreep het verzoek niet goed. Probeer het anders te formuleren.',pw:'Vul eerst het app-wachtwoord in (bijv. via Publiceer) en probeer opnieuw.',nofn:'De AI-functie is niet gevonden op deze site.'}[e.code]||(e.message?'Fout: '+e.message:'Het verzoek kon niet worden verwerkt.');renderChat();return}
    finally{AICTL=null;const s=$('#chatStop');if(s)s.hidden=true}
  }
  const cands=searchOptions([C.id],crit);
  const per=crit.van===crit.tot?fdate(crit.van,{weekday:'long',day:'numeric',month:'long'}):`${fdate(crit.van,{day:'numeric',month:'short'})} t/m ${fdate(crit.tot,{day:'numeric',month:'short'})}`;
  const who=crit.wids&&crit.wids.length?' bij '+crit.wids.map(x=>WRK[x].name.split(' ')[0]).join(' of '):'';
  const tv=crit.mode==='zelfde'?'binnen het tijdvak van de klant':crit.mode==='vrij'?'op elk tijdstip':`tussen ${crit.tFrom} en ${crit.tTo}`;
  reply.busy=false;reply.cands=cands;
  reply.text=`${crit.reply?crit.reply+' ':''}${cands.length?`Gevonden voor ${per}${who}, ${tv}:`:`Ik vond geen plek voor ${per}${who}, ${tv}. Probeer een langere periode, een ander tijdvak of een andere medewerker.`}`;
  C.turns.push({role:'assistant',content:reply.text+(cands.length?' Beste optie: '+candText(cands.find(c=>c.best)||cands[0])+'.':'')});
  renderChat();
}
function chatApply(mi,ci){
  const C=CHAT,m=C&&C.msgs[mi],c=m&&m.cands&&m.cands[ci];if(!c)return;const j=JOB[C.id],old=j.date,was=j.from||j.to?`${j.from||'—'}–${j.to||'—'}`:'hele dag';
  const sg=c.segs[C.id];j.date=c.date;if(c.setWin&&sg){j.from=m2t(sg[0]);j.to=m2t(sg[1])}
  j.notes=((j.notes?j.notes+' · ':'')+`Herpland via AI-chat (was ${fdate(old,{day:'numeric',month:'short'})}, ${was})`);
  const t=applyCand([C.id],old,{kind:'none',date:c.date,wid:c.wid});
  CHAT=null;closeForm();save();render();
  toast(`${j.plate} staat nu bij ${WRK[c.wid].name} op ${fdate(c.date,{weekday:'short',day:'numeric',month:'short'})} om ${m2t(t!=null?t:c.start)} en is vastgezet.`);
}

/* ---------- doorklikken vanuit de planning: bezoek bekijken en opdrachten wijzigen ---------- */
const plateBtn=j=>`<button type="button" class="platebtn" data-act="editjob" data-id="${j.id}" title="Opdracht ${esc(j.plate)} bekijken of wijzigen">${plateHtml(j.plate)}</button>`;
function jobPlanNote(j){
  const P=D.plans[j.date],l=LOC[j.locationId]||{},cu=CUS[l.customerId]||{};let wid=null;
  if(P&&P.routes)for(const k in P.routes)if(P.routes[k].includes(j.id))wid=k;
  let t=`${cu.name||''}, ${[l.address,l.city].filter(Boolean).join(', ')}. `;
  if(wid&&WRK[wid]){const s=simulate(WRK[wid],P.routes[wid],j.date),g=s.seg.find(x=>x.k==='job'&&x.id===j.id);t+=`Gepland bij ${WRK[wid].name} op ${fdate(j.date,{weekday:'short',day:'numeric',month:'short'})}${g?`, ${m2t(g.a)}–${m2t(g.b)}${g.late?(g.ls?' (later dan de vaste tijd)':' (buiten tijdvak)'):''}`:''}.`}
  else t+='Nog niet ingepland.';
  if(P&&P.edited)t+=' Deze dag is handmatig aangepast: na opslaan worden de tijden herberekend en blijft de rest van de planning staan.';
  return t;
}
function openVisit(wid,lid){
  const date=S.date,P=getPlan(date),w=WRK[wid],l=LOC[lid];if(!w||!l)return;const cu=CUS[l.customerId]||{};
  const s=simulate(w,P.routes[wid]||[],date),idx=s.stops.findIndex(x=>x.loc.id===lid),p=s.stops[idx];if(!p)return;
  const rows=p.jobs.map(id=>{const j=JOB[id],g=s.seg.find(x=>x.k==='job'&&x.id===id);
    return`<li class="vjob"><div class="row">${plateBtn(j)}<b>${esc((TYP[j.type]||{}).name||j.type)}</b><span class="muted">${esc(j.vehicle||'')}</span><span class="sp"></span>${stChip(id,date)}${+j.priority===3?'<span class="chip warn">Hoge prio</span>':''}</div>
      <div class="small muted">Gepland ${g?m2t(g.a)+'–'+m2t(g.b):''} (${jobDur(j)} min) · tijdvak klant ${j.from||j.to?esc((j.from||'—')+'–'+(j.to||'—')):'hele dag'}${g&&g.late?' · <b style="color:var(--bad)">'+(g.ls?'later dan de vaste tijd':'buiten tijdvak')+'</b>':''}</div>
      ${j.notes?`<div class="small">${esc(j.notes)}</div>`:''}
      <div class="row"><button class="btn sm primary" data-act="chat" data-id="${id}">${I.auto} Herplan met AI</button><button class="btn sm" data-act="editjob" data-id="${id}">${I.edit} Opdracht wijzigen</button>${g&&g.late?`<button class="btn sm" data-act="propose" data-ids="${id}">${I.auto} Slim voorstel</button>`:''}</div></li>`}).join('');
  FORM=null;
  $('#modal').innerHTML=`<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="vT" style="width:min(680px,100%)">
    <div class="row"><span class="num" style="--c:${wc(w)}">${idx+1}</span><h3 id="vT" style="margin:0">${esc(cu.name||'Onbekende klant')}</h3><span class="chip">${p.jobs.length} ${p.jobs.length===1?'auto':"auto's"}</span></div>
    <p class="note" style="margin:8px 0">${esc([l.address,[l.postcode,l.city].filter(Boolean).join(' ')].filter(Boolean).join(', '))}</p>
    <div class="row small" style="margin-bottom:10px"><i class="dot" style="background:${wc(w)}"></i><b>${esc(w.name)}</b><span>${esc(fdate(date,{weekday:'short',day:'numeric',month:'short'}))} · aankomst ${m2t(p.arrive)} · reinigen ${m2t(p.start)}–${m2t(p.end)} · ${fdur(p.travel)} rijden ernaartoe</span></div>
    ${l.info?`<div class="small" style="background:var(--warn-soft);border-left:3px solid var(--warn);padding:8px 10px;border-radius:6px;margin-bottom:10px"><b>Locatie-info:</b> ${esc(l.info)}</div>`:''}
    ${cu.notes?`<div class="small" style="background:var(--sunk);padding:8px 10px;border-radius:6px;margin-bottom:10px"><b>Opmerkingen klant:</b> ${esc(cu.notes)}</div>`:''}
    ${cu.contact||cu.phone||cu.email||cu.login?`<p class="small" style="margin:0 0 10px">${[cu.contact,cu.phone,cu.email,cu.login?'inlog '+cu.login:''].filter(Boolean).map(esc).join(' · ')}</p>`:''}
    <ul class="vjobs">${rows}</ul>
    <div class="dlg-foot"><button class="btn sm" data-act="editcus" data-id="${cu.id||''}">${I.edit} Klant</button><button class="btn sm" data-act="editloc" data-id="${l.id}">${I.edit} Locatie</button><button class="btn sm" data-act="msgs" data-wid="${w.id}" data-ref="${esc((cu.name||'')+(l.city?', '+l.city:'')+' \u00b7 '+p.jobs.map(id=>JOB[id].plate).join(', '))}">${I.chat} Bericht aan ${esc(w.name.split(' ')[0])}</button><span class="sp"></span><button type="button" class="btn" data-act="dlgx">Sluiten</button></div></div>`;
  $('#modal').hidden=false;
}


/* ---------- beheer: klanten & locaties ---------- */
/* Klanten: zoeken en filteren */
const CF=()=>S.cf||(S.cf={q:'',bill:'',bc:'',sort:'name'});
const normQ=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function cusText(c){return normQ([c.name,c.contact,c.phone,c.email,c.notes,c.bcNo,(CUS[c.billTo]||{}).name].join(' '))}
function locText(l){return normQ([l.name,l.address,l.postcode,l.city,l.info,l.bcShipTo].join(' '))}
function cusPass(c){const f=CF();
  if(f.bill==='self'&&c.billTo)return false;
  if(f.bill==='lease'&&!c.billTo)return false;
  if(f.bill==='isLease'&&!D.customers.some(x=>x.billTo===c.id))return false;
  if(f.bill&&!['self','lease','isLease'].includes(f.bill)&&c.billTo!==f.bill&&c.id!==f.bill)return false;
  const b=billOf(c);if(f.bc==='met'&&!b.bcNo)return false;if(f.bc==='zonder'&&b.bcNo)return false;return true}
function cusFiltered(){const f=CF(),q=normQ(f.q).trim(),words=q?q.split(/\s+/):[];
  const hit=t=>words.every(w=>t.includes(w));
  const locs=D.locations.filter(l=>{const c=CUS[l.customerId];return c&&cusPass(c)&&(!words.length||hit(cusText(c)+' '+locText(l)))});
  const withLoc=new Set(locs.map(l=>l.customerId));
  let cus=D.customers.filter(c=>cusPass(c)&&(!words.length||hit(cusText(c))||withLoc.has(c.id)));
  const nj={};D.jobs.forEach(j=>{const l=LOC[j.locationId];if(l)nj[l.customerId]=(nj[l.customerId]||0)+1});
  const nl={};D.locations.forEach(l=>nl[l.customerId]=(nl[l.customerId]||0)+1);
  cus.sort(f.sort==='jobs'?(a,b)=>(nj[b.id]||0)-(nj[a.id]||0)||a.name.localeCompare(b.name,'nl'):f.sort==='locs'?(a,b)=>(nl[b.id]||0)-(nl[a.id]||0)||a.name.localeCompare(b.name,'nl'):(a,b)=>a.name.localeCompare(b.name,'nl'));
  locs.sort((a,b)=>String((CUS[a.customerId]||{}).name).localeCompare(String((CUS[b.customerId]||{}).name),'nl')||String(a.city).localeCompare(String(b.city),'nl'));
  return{cus,locs,nj,nl}}
function cusRowsHtml(r){return r.cus.map(c=>{const n=r.nl[c.id]||0,lease=CUS[c.billTo],b=billOf(c);return`<tr><td><b>${esc(c.name)}</b>${c.notes?`<div class="small muted" style="max-width:40ch">${esc(c.notes)}</div>`:''}</td><td>${esc(c.contact)}${c.phone?`<div class="small mono muted">${esc(c.phone)}</div>`:''}</td><td class="small">${esc(c.email)}</td><td>${lease?`<span class="chip acc">${esc(lease.name)}</span>`:'<span class="small muted">zelf</span>'}</td><td class="mono small">${b.bcNo?esc(b.bcNo):'<span style="color:var(--warn)">geen</span>'}</td><td>${n}</td><td>${r.nj[c.id]||0}</td><td class="act"><button class="btn ghost" data-act="editcus" data-id="${c.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`}).join('')}
function locRowsHtml(r){return r.locs.map(l=>{const c=CUS[l.customerId]||{};const n=D.jobs.filter(j=>j.locationId===l.id).length;return`<tr><td><b>${esc(c.name)}</b><div class="small muted">${esc(l.name)}</div></td><td>${esc(l.address)}</td><td class="mono">${esc(l.postcode)}</td><td>${esc(l.city)}</td><td><span class="chip ${l.geo==='manual'||l.geo==='pdok'?'ok':l.geo==='pc4'?'acc':'warn'}" title="${esc(l.pdokLabel||l.pdokFail||'')}">${GEO_LABEL[l.geo]||'Onbekend'}</span>${l.pdokFail&&l.geo!=='pdok'?`<div class="small" style="color:var(--warn)">PDOK: ${esc(l.pdokFail)}</div>`:''}</td><td>${n}</td><td class="act"><button class="btn ghost" data-act="editloc" data-id="${l.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`}).join('')}
function cusFilterBar(){const f=CF(),leases=D.customers.filter(c=>D.customers.some(x=>x.billTo===c.id)).sort((a,b)=>a.name.localeCompare(b.name,'nl'));
  const sel=(k,opts,lab)=>`<label class="jf"><span>${lab}</span><select class="mini" data-cf="${k}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(f[k])===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  return`<div class="jfbar"><label class="jf" style="flex:1 1 260px"><span>Zoeken</span><input class="mini" id="cusQ" type="search" value="${esc(f.q)}" placeholder="Naam, contact, adres, plaats, postcode, debiteurnr." autocomplete="off"></label>
  ${sel('bill',[['','Alle klanten'],['self','Factureert zelf'],['lease','Via leasemaatschappij'],['isLease','Is leasemaatschappij'],...leases.map(c=>[c.id,'Via '+c.name])],'Facturatie')}
  ${sel('bc',[['','Alle'],['met','Met debiteurnr.'],['zonder','Zonder debiteurnr.']],'Business Central')}
  ${sel('sort',[['name','Naam A-Z'],['jobs','Meeste opdrachten'],['locs','Meeste locaties']],'Sorteren')}
  ${f.q||f.bill||f.bc?'<button class="btn sm ghost" data-act="cfreset">Filters wissen</button>':''}</div>`}
function cusCounts(r){return[`<span id="cusCount" class="muted small">${r.cus.length} van ${D.customers.length}</span>`,`<span id="locCount" class="muted small">${r.locs.length} van ${D.locations.length}</span>`]}
function cusRefresh(){const r=cusFiltered(),c=cusCounts(r);const a=$('#cusTbody'),b=$('#locTbody');if(!a||!b)return;
  a.innerHTML=cusRowsHtml(r)||'<tr><td colspan="8" class="empty">Geen klanten gevonden</td></tr>';b.innerHTML=locRowsHtml(r)||'<tr><td colspan="7" class="empty">Geen locaties gevonden</td></tr>';
  $('#cusCount').outerHTML=c[0];$('#locCount').outerHTML=c[1]}
function viewCustomers(){
  const r=cusFiltered(),cr=cusRowsHtml(r),lr=locRowsHtml(r),cnt=cusCounts(r);
  return`<section class="panel sec"><div class="toolbar"><h2>Klanten</h2>${cnt[0]}<span class="sp"></span><button class="btn primary" data-act="newcus">${I.plus} Nieuwe klant</button></div>
  ${cusFilterBar()}
  <div class="tbl-wrap"><table><thead><tr><th>Klant</th><th>Contactpersoon</th><th>E-mail</th><th>Factureren aan</th><th>Debiteurnr.</th><th>Locaties</th><th>Opdrachten</th><th></th></tr></thead><tbody id="cusTbody">${cr||`<tr><td colspan="8" class="empty">${D.customers.length?'Geen klanten gevonden':'Nog geen klanten'}</td></tr>`}</tbody></table></div></section>
  <section class="panel sec"><div class="toolbar"><h2>Locaties</h2>${cnt[1]}<span class="sp"></span>${(()=>{const n=D.locations.filter(needsPdok).length;return n?`<button class="btn" data-act="pdok"${SERVER?'':' disabled title="Werkt in de Netlify-versie"'}>${I.route} Posities verbeteren via PDOK (${n})</button>`:''})()}<button class="btn primary" data-act="newloc">${I.plus} Nieuwe locatie</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>Klant · locatie</th><th>Adres</th><th>Postcode</th><th>Plaats</th><th>Positie</th><th>Opdrachten</th><th></th></tr></thead><tbody id="locTbody">${lr||`<tr><td colspan="7" class="empty">${D.locations.length?'Geen locaties gevonden':'Nog geen locaties'}</td></tr>`}</tbody></table></div>
  <p class="hint">Zonder coördinaten schat de app de positie uit de postcode. Vul voor de beste reistijden de exacte breedte- en lengtegraad in (bijv. uit Google Maps: rechtsklik op de plek).</p></section>`;
}
function editCus(id){
  const c0=id?CUS[id]:{name:'',contact:'',phone:'',email:'',login:'',notes:'',locName:'Hoofdlocatie',address:'',postcode:'',city:'',info:''};const c=id?c0:c0;if(!c.bcFail)c.bcFail='nobill';
  const nl=id?D.locations.filter(l=>l.customerId===id):[];const nj=D.jobs.filter(j=>nl.some(l=>l.id===j.locationId)).length;
  const fields=[{k:'name',label:'Klantnaam',req:1,wide:1},{k:'contact',label:'Contactpersoon'},{k:'phone',label:'Telefoon'},{k:'email',label:'E-mail',type:'email'},{k:'login',label:'Inlog (app/account)'},
    {k:'notes',label:'Opmerkingen over deze klant',type:'textarea',plain:1,ph:'bijv. altijd vooraf bellen, facturatie via hoofdkantoor, sleutels bij de receptie'},
    {k:'_bc',type:'heading',label:'Business Central'},{k:'billTo',label:'Factureren aan',type:'select',wide:1,options:[['','Deze klant zelf']].concat(D.customers.filter(x=>x.id!==id&&!x.billTo).sort((a,b)=>a.name.localeCompare(b.name,'nl')).map(x=>[x.id,x.name+(x.bcNo?' ('+x.bcNo+')':'')]))},{k:'bcNo',label:'Debiteurnummer in BC',ph:'bijv. D10023 (leeg laten als je factureert aan een leasemaatschappij)'},{k:'bcFail',label:'Niet gelukt naar BC',type:'select',options:BCFAIL},{k:'bcNb',label:'"Niet beschikbaar" uit Excel naar BC',type:'select',options:[['','Nee'],['1','Ja, als niet factureerbaar']]}];
  if(!id)fields.push({k:'_h',type:'heading',label:'Adres (eerste locatie)'},{k:'locName',label:'Naam locatie',ph:'Hoofdlocatie'},{k:'address',label:'Straat en huisnummer'},{k:'postcode',label:'Postcode',ph:'5301 LK'},{k:'city',label:'Plaats'},
    {k:'info',label:'Locatie-informatie voor de medewerker',type:'textarea',plain:1,ph:'bijv. parkeergarage P2, melden bij de receptie, sleutel in kluisje'});
  openForm({title:id?'Klant bewerken':'Nieuwe klant',fields,values:c,
    note:id?(nl.length?`Locaties: ${nl.map(l=>[l.address,l.city].filter(Boolean).join(', ')||l.name).join(' · ')}. Adressen en locatie-informatie wijzig je bij Locaties; daar voeg je ook een extra locatie toe.`:'Deze klant heeft nog geen locatie. Voeg die toe bij Locaties > Nieuwe locatie.'):'Vul ook het adres in, dan kun je direct opdrachten voor deze klant aanmaken. Meer locaties voeg je later toe bij Locaties.',
    onSave:v=>{
      const cust={name:v.name,contact:v.contact,phone:v.phone,email:v.email,login:v.login,notes:v.notes,bcNo:v.bcNo,bcFail:v.bcFail,bcNb:v.bcNb,billTo:v.billTo||''};
      if(id){Object.assign(c,cust);replan(D.jobs.filter(j=>nl.some(l=>l.id===j.locationId)).map(j=>j.date));toast('Klant opgeslagen.');return}
      const hasAddr=v.address||v.postcode||v.city;let loc=null;
      if(hasAddr){loc={name:v.locName||'Hoofdlocatie',address:v.address,postcode:v.postcode,city:v.city,info:v.info,lat:'',lng:''};const ge=fixGeo(loc,null);if(ge)return ge}
      const nid=uid('c');D.customers.push({id:nid,...cust});
      let newLoc=null;if(loc){newLoc={id:uid('l'),customerId:nid,...loc};D.locations.push(newLoc)}setTimeout(()=>pdokAfterSave(newLoc),50);
      save();render();toast(loc?`Klant en locatie opgeslagen${loc.geo!=='manual'?' (positie geschat uit '+(loc.geo==='plaats'?'de plaats':'de postcode')+')':''}.`:'Klant opgeslagen. Voeg nog een locatie toe om opdrachten te kunnen plannen.');
    },
    onDelete:id?()=>{const lids=new Set(nl.map(l=>l.id));const ds=D.jobs.filter(j=>lids.has(j.locationId)).map(j=>j.date);D.customers=D.customers.filter(x=>x.id!==id);D.locations=D.locations.filter(l=>!lids.has(l.id));D.jobs=D.jobs.filter(j=>!lids.has(j.locationId));replan(ds);toast('Klant verwijderd.')}:null,
    delNote:id&&(nl.length||nj)?`Dit verwijdert ook ${nl.length} locatie(s) en ${nj} opdracht(en).`:''});
}
function editLoc(id,custId){
  if(!D.customers.length){toast('Voeg eerst een klant toe.');return}
  const l=id?LOC[id]:{customerId:custId||D.customers[0].id,name:'Hoofdlocatie',address:'',postcode:'',city:'',lat:'',lng:''};
  const nj=id?D.jobs.filter(j=>j.locationId===id).length:0;
  openForm({title:id?'Locatie bewerken':'Nieuwe locatie',fields:[{k:'customerId',label:'Klant',type:'select',wide:1,options:D.customers.map(c=>[c.id,c.name])},{k:'name',label:'Naam locatie',req:1},{k:'address',label:'Straat en huisnummer'},{k:'postcode',label:'Postcode',ph:'5301 LK'},{k:'city',label:'Plaats'},{k:'bcShipTo',label:'Verzendadrescode in BC (optioneel)',ph:'bijv. ROYALFH'},{k:'lat',label:'Breedtegraad (optioneel)',type:'number',step:'any',ph:'51.8175'},{k:'lng',label:'Lengtegraad (optioneel)',type:'number',step:'any',ph:'5.2620'},{k:'info',label:'Locatie-informatie',wide:1,ph:'bijv. parkeergarage P2, melden bij receptie'}],values:l,
    note:'Laat de coördinaten leeg om ze te schatten uit de postcode of plaats.',
    onSave:v=>{const geo=fixGeo(v,l);if(geo)return geo;let tgt=l;if(id)Object.assign(l,v);else{tgt={id:uid('l'),...v};D.locations.push(tgt)}setTimeout(()=>pdokAfterSave(tgt),50);replan(D.jobs.filter(j=>j.locationId===id).map(j=>j.date));toast('Locatie opgeslagen'+(v.geo!=='manual'?' (positie geschat uit postcode).':'.'))},
    onDelete:id?()=>{const ds=D.jobs.filter(j=>j.locationId===id).map(j=>j.date);D.locations=D.locations.filter(x=>x.id!==id);D.jobs=D.jobs.filter(j=>j.locationId!==id);replan(ds);toast('Locatie verwijderd.')}:null,
    delNote:nj?`Dit verwijdert ook ${nj} opdracht(en) op deze locatie.`:''});
}
function fixGeo(v,old){
  const pcChanged=old&&((v.address!==undefined&&(old.address||'')!==(v.address||''))||(old.postcode||'')!==(v.postcode||'')||(v.city!==undefined&&(old.city||'')!==(v.city||'')));
  if(v.lat!==''&&v.lng!==''&&!(pcChanged&&old.geo!=='manual'&&+v.lat===+old.lat)){v.lat=+v.lat;v.lng=+v.lng;v.geo=(old&&old.geo&&+old.lat===v.lat&&+old.lng===v.lng)?old.geo:'manual';if(v.lat<50||v.lat>54||v.lng<3||v.lng>8)return'Coördinaten liggen buiten Nederland. Controleer breedte- en lengtegraad.';return''}
  const g=geocode(v.postcode,v.city);if(!g)return'Postcode en plaats niet herkend. Vul een Nederlandse postcode in (bijv. 5301 LK) of geef coördinaten op.';
  Object.assign(v,g);return'';
}

/* ---------- beheer: medewerkers ---------- */
function allSkills(){return[...new Set([...D.types.map(t=>t.skill).filter(Boolean),...D.workers.flatMap(w=>w.skills||[])])]}
function viewWorkers(){
  const r=D.workers.map(w=>`<tr><td><b style="display:flex;gap:7px;align-items:center"><i class="dot" style="background:${wc(w)}"></i>${esc(w.name)}</b></td><td>${esc(w.postcode)} ${esc(w.city)}</td><td class="mono">${esc(w.start)}–${esc(w.end)}</td><td>${DAYS.filter(([n])=>(w.days||[]).includes(n)).map(d=>d[1]).join(' ')}</td><td class="small">${(()=>{const up=(D.absences||[]).filter(a=>a.wid===w.id&&a.to>=todayIso()).sort((a,b)=>a.from.localeCompare(b.from));const b=leaveBalance(w,+todayIso().slice(0,4));return(up.length?up.slice(0,3).map(a=>`<div>${absChip(a)} ${esc(absPeriod(a))}</div>`).join('')+(up.length>3?`<div class="muted">+${up.length-3} meer</div>`:''):'<span class="muted">—</span>')+(b.total?`<div class="muted" style="margin-top:3px">Verlof ${todayIso().slice(0,4)}: nog ${b.left} van ${b.total}</div>`:'')})()}</td><td class="small">${Object.entries(w.overrides||{}).filter(([d])=>d>=new Date().toISOString().slice(0,10)).sort().map(([d,o])=>`<span class="chip warn" title="${esc(o.note||'')}">${esc(fdate(d,{day:'numeric',month:'short'}))} ${esc(o.start)}–${esc(o.end)}</span>`).join(' ')||'<span class="muted">—</span>'}</td><td>${(w.skills||[]).map(s=>`<span class="chip">${esc(s)}</span>`).join(' ')||'<span class="muted">—</span>'}</td><td>${avail(w,S.date)?'<span class="chip ok">Beschikbaar</span>':`<span class="chip bad">${esc(availWhy(w,S.date))}</span>`}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-act="wlink" data-id="${w.id}">${I.copy} Kopieer link</button>${sickBtns(w,S.date)}</div></td><td class="act"><button class="btn ghost" data-act="editw" data-id="${w.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`).join('');
  return`<section class="panel"><div class="toolbar"><h2>Medewerkers</h2><span class="sp"></span><button class="btn primary" data-act="neww">${I.plus} Nieuwe medewerker</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>Medewerker</th><th>Standplaats</th><th>Werktijd</th><th>Werkdagen</th><th>Afwezig</th><th>Afwijkende werktijd</th><th>Vaardigheden</th><th>${esc(fdate(S.date,{day:'numeric',month:'short'}))}</th><th>Medewerker-app</th><th></th></tr></thead><tbody>${r||'<tr><td colspan="10" class="empty">Nog geen medewerkers</td></tr>'}</tbody></table></div>
  <p class="hint">Vaardigheden koppelen aan reinigingstypes (Instellingen). Een opdracht die een vaardigheid vraagt, gaat alleen naar medewerkers die die vaardigheid hebben.</p></section>`;
}
function editW(id){
  const w=id?WRK[id]:{name:'',postcode:'',city:'',lat:'',lng:'',start:'08:00',end:'16:30',days:[1,2,3,4,5],absent:[],skills:[],color:D.workers.length%6};
  const vals={...w,color:String(w.color)};
  openForm({title:id?'Medewerker bewerken':'Nieuwe medewerker',fields:[{k:'name',label:'Naam',req:1},{k:'color',label:'Kleur in planning',type:'select',options:COLORS.map((c,i)=>[String(i),c])},{k:'postcode',label:'Standplaats postcode',req:1},{k:'city',label:'Plaats'},{k:'lat',label:'Breedtegraad (optioneel)',type:'number',step:'any'},{k:'lng',label:'Lengtegraad (optioneel)',type:'number',step:'any'},{k:'start',label:'Begintijd',type:'time',req:1},{k:'end',label:'Eindtijd',type:'time',req:1},{k:'days',label:'Werkdagen',type:'checks',num:1,options:DAYS},{k:'skills',label:'Vaardigheden',type:'checks',options:allSkills().map(s=>[s,s])},{k:'leaveDays',label:'Verlofdagen per jaar',type:'number',ph:'bijv. 25'},{k:'bcResource',label:'Resourcenummer in BC (optioneel)',ph:'bijv. SANNE'}].concat(id?[{k:'newtoken',label:'Persoonlijke link voor de medewerker-app',type:'select',wide:1,options:[['','Huidige link behouden'],['1','Nieuwe link maken (de oude link werkt na publiceren niet meer)']]}]:[]),values:vals,
    onSave:v=>{if(t2m(v.end)<=t2m(v.start))return'Eindtijd moet na begintijd liggen.';const ge=fixGeo(v,w);if(ge)return ge;
      v.color=+v.color;
      const nt=v.newtoken;delete v.newtoken;if(id){Object.assign(w,v);if(nt){D.revokeTokens=(D.revokeTokens||[]).concat(w.token||[]);w.token=randTok()}}else D.workers.push({id:uid('w'),token:randTok(),...v});replan([S.date]);toast('Medewerker opgeslagen, planning herberekend.')},
    onDelete:id?()=>{D.workers=D.workers.filter(x=>x.id!==id);replan(Object.keys(D.plans));toast('Medewerker verwijderd.')}:null});
}

function editOvr(wid,date){
  const w=WRK[wid];if(!w)return;const cur=(w.overrides||{})[date];
  openForm({title:`Werktijd ${w.name}, ${fdate(date,{weekday:'short',day:'numeric',month:'short'})}`,note:`Normaal ${w.start}–${w.end}. Een afwijking geldt alleen voor deze dag en wordt in de planning gemarkeerd.`,
    fields:[{k:'start',label:'Begintijd',type:'time',req:1},{k:'end',label:'Eindtijd',type:'time',req:1},{k:'note',label:'Reden of afspraak',wide:1,ph:'bijv. incidenteel langer, afgestemd met medewerker'}],
    values:cur||{start:w.start,end:w.end,note:'Incidenteel langer'},
    onSave:v=>{if(t2m(v.end)<=t2m(v.start))return'Eindtijd moet na begintijd liggen.';w.overrides=w.overrides||{};if(v.start===w.start&&v.end===w.end&&(w.days||[]).includes(wday(date)))delete w.overrides[date];else w.overrides[date]=v;save();render();toast('Werktijd voor deze dag opgeslagen en gemarkeerd. Klik op Automatisch plannen om de extra tijd te benutten.')},
    onDelete:cur?()=>{delete w.overrides[date];save();render();toast('Afwijkende werktijd verwijderd; de normale werktijd geldt weer.')}:null});
}

/* ---------- instellingen ---------- */
function viewSettings(){
  const s=D.settings;
  const num=(k,l,h,step=1)=>`<label class="fld"><span>${l}</span><input type="number" step="${step}" id="set_${k}" data-set="${k}" value="${esc(s[k])}"><small class="muted">${h}</small></label>`;
  const tr=D.types.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td class="mono">${t.dur} min</td><td>${t.skill?`<span class="chip">${esc(t.skill)}</span>`:'<span class="muted">iedereen</span>'}</td><td class="act"><button class="btn ghost" data-act="edittype" data-id="${t.id}" aria-label="Bewerken">${I.edit}</button></td></tr>`).join('');
  const orsPts=orsPointsFor(null),orsMiss=orsMissing(orsPts),orsTot=orsPts.length*(orsPts.length-1);
  const pages={planning:`<section class="panel sec"><h2>Reistijd en werkdag</h2>
  <div class="settings"><label class="fld"><span>Bron voor reistijden</span><select id="set_travelSource" data-set="travelSource"><option value="schatting"${!useORS()?' selected':''}>Schatting (hemelsbreed × wegfactor)</option><option value="ors"${useORS()?' selected':''}>OpenRouteService (echte wegen)</option></select><small class="muted">Bij OpenRouteService gebruikt de app echte rijtijden over de weg. Waar die nog niet zijn opgehaald, wordt geschat.</small></label>
  <div class="fld"><span>OpenRouteService</span><div class="small">${SERVER?`${orsTot?`${orsTot-orsMiss} van ${orsTot} rijtijden opgehaald`:'Nog geen locaties'}${D.orsAt?` · bijgewerkt ${esc(new Date(D.orsAt).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}`:''}`:'Werkt in de Netlify-versie, met ORS_API_KEY in Netlify.'}</div><div class="row" style="margin-top:6px"><button class="btn sm" data-act="orsfetch"${SERVER?'':' disabled'}>${I.route} Rijtijden ophalen</button>${D.ors&&Object.keys(D.ors).length?'<button class="btn sm ghost" data-act="orsclear">Opgehaalde rijtijden wissen</button>':''}</div><small class="muted">Haalt rijtijden op tussen alle standplaatsen en locaties met opdrachten vanaf vandaag. Nieuwe locaties? Klik opnieuw; alleen wat ontbreekt wordt opgehaald.</small></div></div>
  <div class="settings">${num('urbanSpeed','Snelheid in de bebouwde kom (km/u)','Geldt voor de eerste kilometers van elke rit')}${num('urbanKm','Kilometers stadsverkeer per rit','Daarna rekent de app met de snelheid buiten de kom',1)}${num('roadSpeed','Snelheid buiten de kom (km/u)','Gemiddelde inclusief snelweg')}${num('roadFactor','Wegfactor','Hemelsbrede afstand × factor = rijafstand',.05)}${num('parkMin','Parkeren en opstarten (min)','Per aankomst op een klantlocatie')}${num('minTravel','Minimale rijtijd tussen locaties (min)','Voorkomt 0 min bij geschatte posities')}${num('pauseMin','Pauze (min)','0 = geen pauze inplannen')}<label class="fld"><span>Pauze vanaf</span><input type="time" id="set_pauseAt" data-set="pauseAt" value="${esc(s.pauseAt)}"><small class="muted">Eerste moment hierna waarop de pauze geen tijdvak laat missen</small></label>${num('kmWeight','Weging kilometers','Minuten "kosten" per km naast reistijd',.05)}</div>
  <div class="settings">${num('maxPreTravel','Maximale aanrijtijd vóór de begintijd (min)','Rijtijd naar de eerste klant die buiten werktijd valt. Is de rit langer, dan begint de eerste klus later.')}</div>
  <div style="display:grid;gap:8px"><label class="chk"><input type="checkbox" id="set_startAtFirst" data-set="startAtFirst"${s.startAtFirst!==false?' checked':''}> Begintijd = aanwezig bij de eerste klant (aanrijden vanaf standplaats valt vóór de begintijd)</label><label class="chk"><input type="checkbox" id="set_endAtLast" data-set="endAtLast"${s.endAtLast===true?' checked':''}> Eindtijd = klaar bij de laatste klant (terugrit naar standplaats valt na de eindtijd)</label></div>
  <div class="row"><button class="btn primary" data-act="saveset">Opslaan en opnieuw plannen</button></div></section>
  <section class="panel sec"><div class="help"><h3 style="margin-top:14px">Zo rekent de planner</h3>
  <p>Per dag simuleert de app voor elke medewerker de rit: vertrek op begintijd vanaf de standplaats, rijden, parkeren, eventueel wachten tot het tijdvenster opent, reinigen, pauze, en terug naar de standplaats. Een rit is geldig als alle voertuigen binnen hun venster klaar zijn, de medewerker voor de eindtijd terug is en de vaardigheden kloppen.</p>
  <p>Staat "Begintijd = aanwezig bij de eerste klant" aan, dan vertrekt de medewerker zo vroeg dat hij precies op zijn begintijd bij de eerste klant is. Bij begintijd 08:00 kan de eerste klus dus om 08:00 beginnen, waar de medewerker ook woont.</p>
  <p>Het plannen gebeurt in twee stappen. Eerst wordt opdracht voor opdracht ingevoegd op de goedkoopste plek; opdrachten met hoge prioriteit en weinig alternatieven gaan voor. Daarna verschuift de app hele klantlocaties tussen medewerkers en draait volgordes om zolang reistijd en kilometers dalen. Auto's op dezelfde locatie blijven zo vanzelf bij elkaar.</p>
  <p>Reistijden zijn een schatting op basis van hemelsbrede afstand. Voor productie koppel je een routeservice (bijv. OSRM, Google of TomTom) voor echte rijtijden en wegroutes.</p></div></section>`,
  archief:`<section class="panel sec"><h2>Archief</h2><p class="small">Gereed gemelde bezoeken worden naar het archief gekopieerd. De planning zelf blijft ongewijzigd.</p>${archiefHtml()}</section>`,
  types:`<section class="panel sec"><div class="toolbar"><h2>Reinigingstypes</h2><span class="sp"></span><button class="btn" data-act="edittype">${I.plus} Nieuw type</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>Type</th><th>Standaardduur</th><th>Vereiste vaardigheid</th><th></th></tr></thead><tbody>${tr}</tbody></table></div></section>`,
  data:`<section class="panel sec"><h2>Gegevens</h2>
  <p class="help">Gegevens worden in deze browser bewaard. Kopieer een back-up om ze elders te gebruiken of terug te zetten.</p>
  <p class="small muted">Versie van deze app: ${BUILD}</p>
  <div class="row"><button class="btn" data-act="export">${I.copy} Back-up kopiëren</button><button class="btn" data-act="restore">${I.imp} Back-up terugzetten</button><button class="btn danger" data-act="reset">Voorbeelddata herstellen</button></div>
</section>`};
  if(S.setPage==='menu')return viewMenu();
  if(S.setPage==='api')return viewApi();
  return pages[S.setPage]||pages.planning;
}
/* Beheer > API koppelingen: per koppeling een uitklapvenster met status, testen en exporteren */
const API_OPEN=()=>S.apiOpen||(S.apiOpen={bc:true});
function viewApi(){
  const ms=bcMonths();if(!BCST.month||!ms.includes(BCST.month)){BCST.month=todayIso().slice(0,7);setTimeout(()=>bcLoad(BCST.month).then(()=>render()),0)}
  const t=(D.apiTest||{}).bc,rows=(()=>{try{return bcRows().filter(r=>r.d.send).length}catch(e){return 0}})();
  const when=x=>new Date(x).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const bcChip=!SERVER?'<span class="chip">Alleen in de Netlify-versie</span>':!t?'<span class="chip">Nog niet getest</span>':t.ok?`<span class="chip ok">${I.check} Werkt</span>`:'<span class="chip bad">Fout</span>';
  const bcInfo=!SERVER||!t?'':t.ok?`Getest ${esc(when(t.at))} \u00b7 omgeving <b>${esc(t.env||'')}</b>${t.company?' \u00b7 bedrijf <b>'+esc(t.company)+'</b>':''}`:`<span style="color:var(--bad)">${esc(t.error||'')}</span> <span class="muted">(${esc(when(t.at))})</span>`;
  const nPdok=D.locations.filter(needsPdok).length,orsPts=orsPointsFor(null),orsMiss=orsMissing(orsPts),orsTot=orsPts.length*(orsPts.length-1);
  const box=(k,title,sub,chip,body)=>`<details class="panel sec apibox" data-apibox="${k}"${API_OPEN()[k]?' open':''}><summary><span class="apit"><b>${title}</b><span class="small muted">${sub}</span></span><span class="sp"></span>${chip}</summary><div class="apibody">${body}</div></details>`;
  return box('bc','Business Central','Reinigingen naar BC voor facturatie',bcChip,`
    ${bcInfo?`<p style="margin:0 0 10px" class="small">${bcInfo}</p>`:''}
    <div class="row" style="align-items:center;margin-bottom:6px">${SERVER?'<button class="btn sm primary" data-act="bctest">Koppeling testen</button>':''}<span class="small muted">Logt in bij Microsoft en toont de bedrijven in BC. Er verandert niets in BC.</span></div>
    <h3 style="margin:14px 0 6px;font-size:15px">Exporteren</h3>
    <div class="row" style="align-items:center"><select class="mini" data-bcmonth aria-label="Maand">${ms.map(m=>`<option value="${m}"${m===BCST.month?' selected':''}>${esc(fdate(m+'-01',{month:'long',year:'numeric'}))}</option>`).join('')}</select>
    <span class="small muted">${BCST.loading?'laden\u2026':rows+' regel(s) die naar BC gaan'}</span><span class="sp"></span>
    <button class="btn sm" data-act="bccsv">${I.copy} Kopieer als CSV</button><button class="btn sm" data-act="bcjson">${I.copy} Kopieer als JSON (API)</button></div>
    <p class="hint" style="margin:6px 0 0">CSV plak je in Excel; JSON laat precies zien wat de koppeling naar de BC-API stuurt. Versturen doe je bij Opdrachten &gt; <button class="linkbtn" data-act="navto" data-to="facturatie">Business Central interface</button>.</p>`)
  +box('ors','OpenRouteService','Echte rijtijden tussen locaties',useORS()?'<span class="chip ok">Aan</span>':'<span class="chip">Uit (schatting)</span>',`
    <p class="small" style="margin:0 0 10px">${useORS()?(orsTot?`${orsTot-orsMiss} van ${orsTot} rijtijden opgehaald${D.orsAt?' \u00b7 bijgewerkt '+esc(when(D.orsAt)):''}.`:'Nog geen locaties.'):'De planner rekent nu met een schatting (hemelsbreed \u00d7 wegfactor). Zet OpenRouteService aan bij Planning en reistijd voor echte rijtijden.'}</p>
    <div class="row">${SERVER&&useORS()&&orsMiss?`<button class="btn sm primary" data-act="orsfetch">Ontbrekende rijtijden ophalen (${orsMiss})</button>`:''}<button class="btn sm" data-act="navto" data-to="instellingen:planning">Instellen bij Planning en reistijd</button></div>`)
  +box('pdok','PDOK','Postcodes en exacte posities van adressen',nPdok?`<span class="chip warn">${nPdok} geschat</span>`:'<span class="chip ok">Alles exact</span>',`
    <p class="small" style="margin:0 0 10px">Gratis, zonder sleutel. Nieuwe locaties en adressen zonder postcode bij een import worden automatisch opgezocht.${nPdok?` ${nPdok} locatie(s) hebben nog een geschatte positie.`:''}</p>
    ${nPdok?`<div class="row"><button class="btn sm primary" data-act="pdok"${SERVER?'':' disabled title="Werkt in de Netlify-versie"'}>Posities verbeteren via PDOK (${nPdok})</button></div>`:''}`)
  +box('ai','AI-advies (Claude)','Slim voorstel en vragen over de planning',SERVER?'<span class="chip">Via Netlify</span>':'<span class="chip ok">Actief in Claude</span>',`
    <p class="small" style="margin:0">${SERVER?'Werkt via de Netlify-functie ai-advies met je eigen API-sleutel. Bij een fout vraagt de app om het app-wachtwoord.':'In Claude werkt het AI-advies direct, zonder sleutel.'}</p>`)
  +box('app','Medewerker-app','Ritten publiceren, meldingen en berichten',SERVER?'<span class="chip ok">Actief</span>':'<span class="chip">Alleen in de Netlify-versie</span>',`
    <p class="small" style="margin:0 0 10px">Ritten, gereedmeldingen en berichten worden bewaard in Netlify Blobs. Elke medewerker heeft een persoonlijke link.</p>
    <div class="row"><button class="btn sm" data-act="navto" data-to="medewerkers">Links van medewerkers</button></div>`);
}
function editType(id){
  const t=id?TYP[id]:{name:'',dur:30,skill:''};const used=id?D.jobs.filter(j=>j.type===id).length:0;
  openForm({title:id?'Reinigingstype bewerken':'Nieuw reinigingstype',fields:[{k:'name',label:'Naam',req:1},{k:'dur',label:'Standaardduur (min)',type:'number',req:1},{k:'skill',label:'Vereiste vaardigheid (leeg = iedereen)',wide:1,ph:'bijv. coating'},{k:'bcItem',label:'Artikel- of resourcenummer in BC',ph:'bijv. BUITENWAS'}],values:t,
    onSave:v=>{v.dur=+v.dur||30;v.skill=v.skill.toLowerCase();if(id)Object.assign(t,v);else D.types.push({id:uid('t'),...v});replan(Object.keys(D.plans));toast('Type opgeslagen.')},
    onDelete:id&&!used?()=>{D.types=D.types.filter(x=>x.id!==id);save();render()}:null});
}


