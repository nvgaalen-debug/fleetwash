/* ---------- Domeinprofiel: maakt de planner bruikbaar voor andere branches dan autowassen ----------
   Een profiel (profielen/<id>.js) levert de woorden die de gebruiker ziet (T), de regels voor de import en de
   medewerker-app. De planningsmotor zelf is generiek: opdrachten met een locatie, tijdvak, duur en vaardigheid.
   Het gekozen profiel staat in D.settings.profiel (standaard 'wassen'). */
const PROFIELEN={};
function profielRegistreer(p){PROFIELEN[p.id]=p}
let PRF=null;
/* T: de woorden van het actieve profiel. Altijd gevuld (eerst met wassen), zodat schermen nooit een lege tekst tonen. */
const T={};
function profielKies(id){
  const p=PROFIELEN[id]||PROFIELEN.wassen;if(!p)return null;
  PRF=p;for(const k of Object.keys(T))delete T[k];Object.assign(T,(PROFIELEN.wassen||{}).woorden||{},p.woorden||{});
  try{if(typeof document!=='undefined'&&document.querySelector){
    /* Elementen met data-profiel="<woord>" krijgen dat woord; de paginatitel volgt data-profiel-titel op <body> (app of planner) */
    document.querySelectorAll('[data-profiel]').forEach(el=>{const v=T[el.dataset.profiel];if(v)el.textContent=v});
    const app=document.body&&document.body.dataset.profielTitel==='app';
    document.title=app?T.appNaam:(p.titel||document.title);
    /* Branche-kleur en -icoon (css/app.css resp. het eigen stijlblok van medewerker.html kiezen de kleur op dit attribuut;
       zonder eigen stijl blijft het de kleur/vorm van wassen, zodat dat profiel er niet door verandert) */
    document.documentElement.dataset.profiel=p.id;
    const st=p.stijl||(PROFIELEN.wassen&&PROFIELEN.wassen.stijl);
    if(st){
      const svg=document.querySelector('.brand svg[data-logo]');if(svg)svg.innerHTML=(app?st.medewerker:st.planner)||svg.innerHTML;
      const tc=document.querySelector('meta[name="theme-color"]');if(tc&&st.accent)tc.content=st.accent;
    }
  }}catch(e){}
  if(typeof menuProfiel==='function')try{menuProfiel()}catch(e){}
  return p;
}
/* Aantal + juiste vorm: nObj(1) = "auto", nObj(3) = "auto's" */
const nObj=n=>n===1?T.obj:T.objMv;
const nObjLang=n=>n===1?T.objLang:T.objLangMv;
/* Regels van het profiel, met de waarden van wassen als terugval */
const prfRegel=(k,dflt)=>{const r=(PRF&&PRF.regels)||{};return r[k]!==undefined?r[k]:dflt};
/* Kolomherkenning bij import: reguliere expressie uit het profiel (hoofdletterongevoelig), met de wasregel als terugval */
const prfRe=(k,dflt)=>new RegExp((PRF&&PRF.import&&PRF.import[k])||dflt,'i');
