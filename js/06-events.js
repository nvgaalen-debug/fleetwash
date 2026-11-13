/* ---------- events ---------- */
function onClick(e){
  if(!e.target.closest('.navg'))closeMenus();
  const inCtx=e.target.closest('#ctx');if(!inCtx)closeCtx();else setTimeout(closeCtx,0);
  const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(el.tagName==='SELECT')return;
  if(a==='sel'&&e.target.closest('select,button:not([data-act="sel"])'))return;
  switch(a){
    case'tab':S.tab=el.dataset.k;render();window.scrollTo(0,0);break;
    case'navto':navTo(el.dataset.to);break;
    case'menuup':case'menudown':{const m=menuCfg(),w=el.dataset.w,list=w==='top'?m.top:w==='hidden'?m.hidden:m.groups[w.slice(2)].items;menuShift(list,el.dataset.id,a==='menuup'?-1:1);save();render();break}
    case'menunewg':{const m=menuCfg(),k=uid('g');m.groups[k]={l:'Nieuwe groep',items:[]};m.top.push('g:'+k);save();render();const i=document.querySelector(`[data-menuname="${k}"]`);if(i){i.focus();i.select()}break}
    case'menudelg':{const m=menuCfg(),k=el.dataset.k;if(m.groups[k]&&!m.groups[k].items.length){delete m.groups[k];m.top=m.top.filter(x=>x!=='g:'+k);save();render()}break}
    case'menureset':D.menu=menuDefault();save();render();toast('Standaardindeling hersteld.');break;
    case'navg':{const g=el.closest('.navg'),open=!g.classList.contains('open');closeMenus();if(open){g.classList.add('open');el.setAttribute('aria-expanded','true');const f=g.querySelector('[role=menuitem]');if(f&&e.detail===0)f.focus()}break}
    case'day':stepPeriod(+el.dataset.d);break;
    case'today':S.date=todayIso();S.selLoc=null;save();render();break;
    case'pview':S.pview=el.dataset.v;D.ui=D.ui||{};save();render();window.scrollTo(0,0);break;
    case'gotoday':S.date=el.dataset.date;S.pview='dag';if(el.dataset.wid)S.wid=el.dataset.wid;S.selLoc=null;save();render();window.scrollTo(0,0);break;
    case'gotoweek':S.date=el.dataset.date;S.pview='week';save();render();break;
    case'aiday':aiVoorstel([S.date]);break;
    case'aiweek':aiVoorstel([...Array(7)].map((_,i)=>addDays(weekStart(S.date),i)));break;
    case'auto':autoPlan(S.date);save();render();toast('Planning automatisch opnieuw gemaakt. Vastgezette bezoeken zijn gerespecteerd.');break;
    case'unpinall':{const P=getPlan(S.date);P.pinned={};P.edited=Date.now();save();render();toast('Alle vastzettingen opgeheven. Klik Automatisch plannen om vrij te optimaliseren.');break}
    case'selw':S.wid=el.dataset.wid;S.selLoc=null;render();break;
    case'sel':S.wid=el.dataset.wid;S.selLoc=S.selLoc===el.dataset.loc?null:el.dataset.loc;render();break;
    case'mapmode':S.mapMode=el.dataset.k;render();break;
    case'seqopt':{const P=getPlan(S.date),w=WRK[el.dataset.wid];const before=simulate(w,P.routes[w.id]||[]);const R={[w.id]:[...(P.routes[w.id]||[])]};improve(R,[w],P.pinned,true);P.routes[w.id]=R[w.id];P.edited=Date.now();const after=simulate(w,R[w.id]);save();render();toast(after.trav<before.trav?`Volgorde verbeterd: ${fdur(before.trav-after.trav)} minder rijtijd.`:'De huidige volgorde is al optimaal.');break}
    case'mv':{const P=getPlan(S.date),wid=el.dataset.wid,ids=el.dataset.ids.split(','),r=P.routes[wid];const bl=blocksOf(r);const i=bl.findIndex(b=>b.ids[0]===ids[0]);const j=i+(+el.dataset.dir);if(i<0||j<0||j>=bl.length)return;[bl[i],bl[j]]=[bl[j],bl[i]];P.routes[wid]=bl.flatMap(b=>b.ids);ids.forEach(id=>P.pinned[id]=wid);P.edited=Date.now();save();render();toast('Volgorde aangepast, tijden herberekend.');break}
    case'pin':{const P=getPlan(S.date),wid=el.dataset.wid,ids=el.dataset.ids.split(',');const all=ids.every(id=>P.pinned[id]===wid);ids.forEach(id=>{if(all)delete P.pinned[id];else P.pinned[id]=wid});save();render();toast(all?'Losgemaakt: de planner mag dit bezoek weer verplaatsen.':'Vastgezet bij '+WRK[wid].name+'.');break}
    case'jobscope':S.jobScope=el.dataset.k;render();break;
    case'newjob':editJob(null);break;case'editjob':editJob(el.dataset.id);break;
    case'import':openXlsxImport();break;
    case'csvimport':openImport();break;
    case'xdo':doXImport();break;
    case'openlog':openLog();break;
    case'logf':LOGF.st=el.dataset.k;logRefresh();break;
    case'logfix':openLogFix(el.dataset.i);break;
    case'logmove':openLogMove(el.dataset.i);break;
    case'loggo':logGoto(el.dataset.i);break;
    case'logdone':{const e=logEntry(el.dataset.i);if(e){e.done=!e.done;save();logRefresh()}break}
    case'logbulk':openLogBulk();break;
    case'logbulkdone':{let n=0;for(const i of LOGSEL){const e=logEntry(i);if(e&&PROBLEM.has(liveEntries({entries:[e]})[0].st)){e.done=true;n++}}LOGSEL=new Set();save();logRefresh();toast(`${n} regel(s) afgehandeld.`);break}
    case'jfgoto':S.date=el.dataset.date;S.wid=el.dataset.wid;S.tab='planning';render();setTimeout(()=>{const r=document.querySelector('.split');if(r)r.scrollIntoView({behavior:'smooth',block:'start'})},50);break;
    case'ctxnew':newJobAt(el.dataset.wid,el.dataset.t,el.dataset.loc);break;
    case'ctxmove':moveJobs(el.dataset.ids.split(','),el.dataset.wid||null);break;
    case'bctoggle':{const j=JOB[el.dataset.id];if(!j)break;const st=(BCST.data[j.date]||{})[j.id]||stMap(j.date)[j.id]||{st:'issue'};const d=bcDecide(j,st);D.bcOverride=D.bcOverride||{};const nv=!d.send;delete D.bcOverride[j.id];if(bcDecide(j,st).send!==nv)D.bcOverride[j.id]=nv;save();render();toast(nv?`${j.plate} gaat naar Business Central.`:`${j.plate} gaat niet naar Business Central.`);break}
    case'bcreset':{if(D.bcOverride)delete D.bcOverride[el.dataset.id];save();render();break}
    case'bcref':bcLoad(BCST.month).then(()=>{render();bcFetchState()});break;
    case'bcsend':bcSend(false);break;
    case'bctest':bcTest();break;
    case'bcsendok':closeForm();bcSend(true);break;
    case'bccsv':bcExport('csv');break;case'bcjson':bcExport('json');break;
    case'rawbackup':{let raw='';try{raw=localStorage.getItem(KEY)||''}catch(e){}if(!raw)raw=JSON.stringify(D);copyText(raw,'Back-up gekopieerd. Plak hem in een tekstbestand en bewaar dat.');break}
    case'jfclear':S.jf={...JF0,sort:jf().sort};render();break;
    case'logclr':LOGSEL=new Set();logRefresh();break;
    case'logdel':if(el.dataset.armed){const lg=curLog();D.importLogs=importLogs().filter(x=>x!==lg);S.logId=null;LOGSRC=null;save();render();toast('Log verwijderd; de opdrachten blijven staan.')}else{el.dataset.armed='1';el.textContent='Klik nogmaals om te verwijderen'}break;
    case'ximport':openXlsxImport();break;
    case'logcsv':logCsv();break;
    case'cfreset':{S.cf={q:'',bill:'',bc:'',sort:CF().sort};render();break}
    case'xpvf':{if(XIMP){XIMP.pv.f=el.dataset.f;renderXPrev();if(el.closest('#xdet'))xScrollTbl()}break}
    case'xdet':{if(XIMP){const k=el.dataset.k;if(k==='imp'){XIMP.det=XIMP.det==='imp'?null:'imp';XIMP.pv.f='imp';XIMP.pv.q='';renderXPrev();xScrollTbl()}else{XIMP.det=XIMP.det===k?null:k;if(k==='skip'&&XIMP.det)XIMP.pv.f='skip';renderXPrev()}}break}
    case'xpvq':{if(XIMP){XIMP.pv.q=el.dataset.q;XIMP.pv.f='all';renderXPrev();xScrollTbl()}break}
    case'xlog':{const box=$('#xlogBox');if(box.innerHTML){box.innerHTML='';el.textContent=`Bekijk alle regels per voertuig (${XIMP.log.length})`}else{LOGSRC={entries:XIMP.log,preview:true};LOGF={st:'alle',q:'',m:''};box.innerHTML=logShell();logRefresh();el.textContent='Verberg regels'}break}
    case'publish':openPublish();break;
    case'wlink':copyWorkerLink(el.dataset.id);break;
    case'visit':S.wid=el.dataset.wid;S.selLoc=el.dataset.loc;openVisit(el.dataset.wid,el.dataset.loc);break;
    case'repf':S.repF=el.dataset.k;render();break;
    case'handled':{D.handled=D.handled||{};if(D.handled[el.dataset.id])delete D.handled[el.dataset.id];else D.handled[el.dataset.id]=Date.now();save();render();break}
    case'refreshst':fetchStatus(S.date,true).then(()=>{render();toast('Meldingen bijgewerkt.')});break;
    case'copymsg':if(PROP&&PROP.ai)copyText(PROP.ai.msg,'Bericht gekopieerd.');break;
    case'sick':openSick(el.dataset.id);break;
    case'sickundo':sickUndo();break;
    case'unsick':openUnsick(el.dataset.id);break;
    case'sickclose':if(SICK){delete SICK.snap;save()}SICK=null;closeForm();render();break;
    case'sickview':{const K=(D.sickLog||[]).find(x=>x.id===el.dataset.id);if(K){delete K.snap;save();SICK=K;openSickResult()}break}
    case'sickai':sickAI();break;
    case'sickapply':sickApply([+el.dataset.g]);break;
    case'sickapplyall':sickApply(SICK&&SICKAI[SICK.id]?SICKAI[SICK.id].picks.map(p=>p.g):[]);break;
    case'sickcopy':if(SICK&&SICKAI[SICK.id])copyText(SICKAI[SICK.id].msgs[+el.dataset.g]||'','Bericht gekopieerd.');break;
    case'combopick':comboPick(el.dataset.k,el.dataset.v);break;
    case'chat':openChat(el.dataset.id);break;
    case'chatquick':chatSend(el.dataset.q);break;
    case'archiefnu':archiveerGereed();break;
    case'archtoon':archiefToon();break;
    case'archsave':archiefTermijnOpslaan();break;
    case'archopruim':archiefOpruimen();break;
    case'chatapply':chatApply(+el.dataset.m,+el.dataset.i);break;
    case'orsfetch':fetchORS(el.dataset.date?[el.dataset.date]:null);break;
    case'pdok':pdokImprove();break;
    case'orsclear':D.ors={};D.orsAt=null;save();render();toast('Opgehaalde rijtijden gewist; de schatting wordt weer gebruikt.');break;
    case'msgs':openMsgs({wid:el.dataset.wid,ref:el.dataset.ref});break;
    case'msgw':{const t=$('#msgTxt');if(t)MV.draft=t.value;MV.wid=el.dataset.wid;markSeen(MV.wid);renderMsgs();break}
    case'msgtpl':{const t=$('#msgTxt');t.value=(t.value?t.value.trim()+' ':'')+MSGT[+el.dataset.i];t.focus();const k=t.value.indexOf('{tijd}');if(k>=0)t.setSelectionRange(k,k+6);break}
    case'msgsend':sendMsg();break;
    case'msgnoref':{const t=$('#msgTxt');if(t)MV.draft=t.value;MV.ref='';renderMsgs();break}
    case'msgref':fetchMsgs(true).then(()=>{if(MSG.err==='pw'){const w=MV&&MV.wid;askPw(()=>{openMsgs({wid:w})})}else renderMsgs()});break;
    case'msgclose':closeForm();render();break;
    case'absnew':openAbs(null,{wid:el.dataset.wid,date:el.dataset.date});break;
    case'absedit':openAbs(el.dataset.id);break;
    case'absmonth':{const ym=S.absMonth||S.date.slice(0,7);S.absMonth=addDays(ym+'-15',+el.dataset.d*30).slice(0,7);render();break}
    case'absscope':S.absScope=el.dataset.k;render();break;
    case'absgo':{const P=ABSPEND;ABSPEND=null;if(!P)break;closeForm();if(el.dataset.mode==='redis'){runSick(P.rec.wid,P.rec.from,P.rec.to,ABS[P.rec.type].name+(P.rec.note?' \u2013 '+P.rec.note:''),{rec:P.rec})}else absStore(P.rec,P.old);break}
    case'absredis':{const a=(D.absences||[]).find(x=>x.id===el.dataset.id);if(a)runSick(a.wid,a.from<todayIso()?todayIso():a.from,a.to,ABS[a.type].name+(a.note?' \u2013 '+a.note:''),{existing:true,type:a.type});break}
    case'propose':{const fs=!!$('#skT');openPropose(el.dataset.ids.split(','));if(PROP)PROP.fromSick=fs;break}
    case'extend':{const w=WRK[el.dataset.wid],d=PROP.date,ids=PROP.ids;w.overrides=w.overrides||{};w.overrides[d]={start:el.dataset.start,end:el.dataset.end,note:'Incidenteel langer'};
      const P=getPlan(d);for(const k of Object.keys(P.routes))P.routes[k]=P.routes[k].filter(id=>!ids.includes(id));
      const b=bestPos(w,P.routes[w.id]||[],ids,true)||bestPos(w,P.routes[w.id]||[],ids,false);P.routes[w.id]=b.arr;ids.forEach(id=>P.pinned[id]=w.id);P.edited=Date.now();if(!P.auto)P.auto=Date.now();
      const g=b.s.seg.find(x=>x.k==='job'&&x.id===ids[0]);if(AICTL)AICTL.abort();closeForm();PROP=null;S.wid=w.id;save();render();
      toast(`${w.name} werkt op ${fdate(d,{weekday:'short',day:'numeric',month:'short'})} incidenteel ${el.dataset.start}–${el.dataset.end}. Ingepland om ${g?m2t(g.a):''} en gemarkeerd.`);break}
    case'ovr':editOvr(el.dataset.wid,S.date);break;
    case'papply':applyProp(+el.dataset.i);break;
    case'askai':askAI();break;
    case'aistop':if(AICTL)AICTL.abort();break;
    case'newcus':editCus(null);break;case'editcus':editCus(el.dataset.id);break;
    case'newloc':editLoc(null);break;case'editloc':editLoc(el.dataset.id);break;
    case'neww':editW(null);break;case'editw':editW(el.dataset.id);break;
    case'edittype':editType(el.dataset.id||null);break;
    case'saveset':{document.querySelectorAll('[data-set]').forEach(i=>{const k=i.dataset.set;D.settings[k]=i.type==='checkbox'?i.checked:i.type==='number'?(+i.value||0):i.value});replan(Object.keys(D.plans));toast('Instellingen opgeslagen, planningen opnieuw berekend.');break}
    case'export':copyText(JSON.stringify(D),'Back-up gekopieerd naar het klembord.');break;
    case'restore':openForm({title:'Back-up terugzetten',okLabel:'Terugzetten',note:'Plak een eerder gekopieerde back-up. Dit vervangt alle huidige gegevens.',fields:[{k:'csv',label:'Back-up (JSON)',type:'textarea'}],values:{},onSave:v=>{try{const x=JSON.parse(v.csv);if(!x.version||!x.jobs)throw 0;D=x;save();render();toast('Back-up teruggezet.')}catch(e){return'Dit is geen geldige back-up.'}}});break;
    case'reset':if(el.dataset.armed){D=sample();S.date='2026-10-29';save();render();toast('Voorbeelddata hersteld.')}else{el.dataset.armed='1';el.textContent='Klik nogmaals: alles wordt vervangen';setTimeout(()=>{if(el.isConnected){delete el.dataset.armed;el.textContent='Voorbeelddata herstellen'}},4000)}break;
    case'dlgx':if(AICTL)AICTL.abort();if(PROP&&PROP.fromSick&&SICK){PROP=null;openSickResult();break}closeForm();break;
    case'dlgdel':if(el.dataset.armed){const f=FORM.onDelete;closeForm();f()}else{el.dataset.armed='1';el.textContent='Klik nogmaals om te verwijderen';if(FORM.delNote)showErr(FORM.delNote)}break;
  }
}
function onChange(e){
  const el=e.target;
  if(el.id==='xf'&&el.files&&el.files[0])return readXlsx(el.files[0]);
  if((el.id==='xclear'||el.id==='xfuture'||el.id==='xslot'||el.id==='xtype')&&XIMP)return renderXPrev();
  if(el.dataset.xname!=null&&XIMP){XIMP.names=Object.assign({},XIMP.names,{[el.dataset.xname]:el.value});return xReparse()}
  if(el.id==='xcust'&&XIMP){XIMP.custEdit=el.value;return xReparse()}
  if(el.id==='xbill'&&XIMP){XIMP.billTo=el.value;renderXPrev();if(el.value==='__new')setTimeout(()=>{const i=$('#xbillnew');if(i)i.focus()},0);return}
  if(el.id==='xbillnew'&&XIMP){XIMP.billToNew=el.value;const n=$('#xbillname');if(n)n.textContent=xBillName(XIMP)||'(naam invullen)';return}
  if(el.dataset.menuloc){menuMove(el.dataset.menuloc,el.value);save();render();toast(`${MENU_ITEMS[el.dataset.menuloc][0]} staat nu ${el.value==='top'?'in het hoofdmenu':el.value==='hidden'?'verborgen':'onder '+menuCfg().groups[el.value.slice(2)].l}.`);return}
  if(el.dataset.menuname){const g=menuCfg().groups[el.dataset.menuname];if(g){g.l=el.value.trim()||g.l;save();render()}return}
  if(el.dataset.cf){CF()[el.dataset.cf]=el.value;render();return}
  if(el.dataset.bcmonth!=null){bcLoad(el.value).then(render);return}
  if(el.dataset.bcf){(S.bcf=S.bcf||{c:'',k:''})[el.dataset.bcf]=el.value;return render()}
  if(el.id==='logM'){LOGF.m=el.value;return logRefresh()}
  if(el.id==='logC'){LOGF.c=el.value;return logRefresh()}
  if(el.id==='logSort'){LOGF.sort=el.value;return logRefresh()}
  if(el.id==='logFrom'){LOGF.from=el.value;return logRefresh()}
  if(el.id==='logTo'){LOGF.to=el.value;return logRefresh()}
  if(el.dataset.jf){jf()[el.dataset.jf]=el.value;const t=$('#jobsTbl');if(t)t.innerHTML=jobsTable();if(el.dataset.jf!=='sort'){const bar=document.querySelector('.jfbar');if(bar)bar.outerHTML=jobFilterBar()}return}
  if(el.id==='logPick'){S.logId=el.value;LOGSRC=null;LOGF={st:'probleem',q:'',m:'',c:''};return render()}
  if(el.dataset.logsel!=null){const i=+el.dataset.logsel;if(el.checked)LOGSEL.add(i);else LOGSEL.delete(i);return logBulkBar()}
  if(el.id==='logAll'){const rows=logFiltered(liveEntries(LOGSRC)).slice(0,500);rows.forEach(e=>el.checked?LOGSEL.add(e.i):LOGSEL.delete(e.i));return logRefresh()}
  if(el.dataset.msgsel&&MV){if(el.checked)MV.sel.add(el.dataset.msgsel);else MV.sel.delete(el.dataset.msgsel);return}
  if(el.id==='msgUrg'&&MV){MV.urgent=el.checked;return}
  if(el.dataset.absf){if(el.dataset.absf==='w')S.absW=el.value;else S.absT=el.value;return render()}
  if(el.id==='dateIn'&&el.value){S.date=el.value;S.selLoc=null;save();render();return}
  if(el.dataset.act==='moveto'&&el.value){const ids=el.dataset.ids.split(',');let w=el.value;
    if(w==='__un')return moveJobs(ids,null);
    if(w==='__best'){w=bestWorkerFor(ids);if(!w){toast('Bij niemand past dit binnen werktijd en tijdvenster. Kies zelf een medewerker om toch in te plannen.');el.value='';return}}
    moveJobs(ids,w,'best')}
}
let DRAG=null;
function onDragStart(e){const el=e.target.closest&&e.target.closest('[data-drag]');if(!el)return;DRAG=el.dataset.drag.split(',');try{e.dataTransfer.setData('text/plain',el.dataset.drag);e.dataTransfer.effectAllowed='move'}catch(x){}el.classList.add('dragging');e.stopPropagation()}
function clearOver(){document.querySelectorAll('.over').forEach(x=>x.classList.remove('over'))}
function onDragOver(e){if(!DRAG)return;const z=e.target.closest('[data-drop]');if(!z)return;e.preventDefault();if(!z.classList.contains('over')){clearOver();z.classList.add('over')}}
function onDrop(e){if(!DRAG)return;const z=e.target.closest('[data-drop]');if(!z)return;e.preventDefault();const ids=DRAG;DRAG=null;clearOver();
  const[k,wid,before]=z.dataset.drop.split(':');
  if(k==='un')return moveJobs(ids,null);
  if(k==='row')return moveJobsAt(ids,wid,timeAt(z,e));
  if(k==='end')return moveJobs(ids,wid,null);
  if(k==='before'){if(ids.includes(before))return;return moveJobs(ids,wid,before)}
}
function onDragEnd(){DRAG=null;clearOver();document.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'))}
/* Eerdere variant (4 nov): bedrijven werden locaties onder de leasemaatschappij. Terugzetten: bedrijf = klant, met Factureren aan. */
function migrateBillTo(){
  if(D.migBillTo)return;let n=0;
  for(const lg of (D.importLogs||[]))for(const e of (lg.entries||[])){
    if(!e.billTo||!e.jobId)continue;const j=D.jobs.find(x=>x.id===e.jobId);if(!j)continue;const lo=D.locations.find(l=>l.id===j.locationId);
    if(!lo||lo.customerId!==e.billTo||clean(lo.name).toLowerCase()!==clean(e.cust).toLowerCase())continue;
    let cu=D.customers.find(x=>x.id!==e.billTo&&clean(x.name).toLowerCase()===clean(e.cust).toLowerCase());
    if(!cu){cu={id:uid('c'),name:clean(e.cust),contact:'',phone:'',email:'',login:''};D.customers.push(cu)}
    cu.billTo=e.billTo;lo.customerId=cu.id;lo.name=lo.address||'Locatie';n++}
  D.migBillTo=1;if(n){index();save()}
}
function init(){
  try{load();migrateBillTo()}catch(err){if(!D)D=sample();try{index()}catch(e){}setTimeout(()=>showFatal('gegevens laden',err),0)}
  initSync();
  try{if(window.claude&&typeof window.claude.use==='function')window.claude.use('sample').then(s=>{SAMPLE=s||null}).catch(()=>{})}catch(e){}
  document.addEventListener('click',onClick);
  if(SERVER)setInterval(()=>{if(!document.hidden&&(S.tab==='planning'||S.tab==='opdrachten'))fetchStatus(S.date,true)},60000);if(SERVER)setInterval(()=>{if(!document.hidden&&(MV||(S.tab==='planning'&&Date.now()-MSG.at>30000)))fetchMsgs(true)},15000);document.addEventListener('change',onChange);document.addEventListener('contextmenu',onContext);addEventListener('scroll',closeCtx,{passive:true});addEventListener('resize',closeCtx);
  document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.combo){const k=e.target.dataset.combo;$('#f_'+k).value='';comboShow(k,e.target.value);return}if(e.target.id==='jobQ'){S.jobQ=e.target.value;$('#jobsTbl').innerHTML=jobsTable()}if(e.target.id==='logQ'){LOGF.q=e.target.value;logRefresh()}if(e.target.id==='cusQ'){CF().q=e.target.value;cusRefresh()}if(e.target.id==='xpvq'&&XIMP){XIMP.pv.q=e.target.value;xPvRefresh()}});
  document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.apibox)API_OPEN()[d.dataset.apibox]=d.open},true);
  document.addEventListener('dragstart',onDragStart);document.addEventListener('dragover',onDragOver);document.addEventListener('drop',onDrop);document.addEventListener('dragend',onDragEnd);
  document.addEventListener('keydown',e=>{const t=e.target;if(S.tab==='planning'&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&$('#modal').hidden&&!(t&&(/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)||t.isContentEditable))){
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepPeriod(e.key==='ArrowLeft'?-1:1);return}
    if(e.key==='t'||e.key==='T'){S.date=todayIso();save();render();return}
    if(e.key==='d'||e.key==='w'||e.key==='m'){S.pview={d:'dag',w:'week',m:'maand'}[e.key];save();render();return}}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#ctx')){closeCtx();return}if(e.key==='Escape'){if(document.querySelector('.navg.open')){const b=document.querySelector('.navg.open > .tab');closeMenus();if(b)b.focus();return}if(!$('#modal').hidden)closeForm()}});
  $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeForm()});
  render();
}
if(typeof document!=='undefined'&&document.getElementById('view'))init();
