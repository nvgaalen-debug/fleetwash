/* ---------- gedeelde planning op de server (Azure Table Storage via /api/state) ----------
   Uitgangspunt: lokale wijzigingen worden nooit stil overschreven.
   - SYNC.base is de vingerafdruk van de planning zoals die laatst gelijk was aan de server.
   - Geen niet-opgeslagen wijzigingen lokaal: de serverversie wordt geladen.
   - Wel niet-opgeslagen wijzigingen lokaal en ook een planning op de server: de app vraagt wat je wilt.
   - Vóór elke overschrijving wordt een backup van de lokale gegevens bewaard (localStorage 'wasroute.backup'). */
let SYNC=(()=>{try{return JSON.parse(localStorage.getItem('wasroute.sync'))||{sv:null,base:null}}catch(e){return {sv:null,base:null}}})();
let PUSH_T=null, PUSHING=false, PUSH_AGAIN=false;

function saveSync(){try{localStorage.setItem('wasroute.sync',JSON.stringify(SYNC))}catch(e){}}

// Vingerafdruk van de planning zonder het UI-blok (datum en weergave horen niet bij de gegevens)
function snapText(){const {ui,...rest}=D;return JSON.stringify(rest)}
function fp(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)+':'+text.length}
const pendingLocal=()=>fp(snapText())!==SYNC.base;

function backupLocal(reason){
  try{
    const list=JSON.parse(localStorage.getItem('wasroute.backup')||'[]');
    list.unshift({at:new Date().toISOString(),reason,data:localStorage.getItem(KEY)});
    localStorage.setItem('wasroute.backup',JSON.stringify(list.slice(0,3)));
  }catch(e){}
}

// De serverversie overnemen (vóór het overnemen wordt de lokale versie bewaard)
function adoptServer(r){
  backupLocal('vóór laden van de serverversie');
  localStorage.setItem(KEY,JSON.stringify(r.data));
  load();migrateBillTo();index();
  SYNC.sv=r.version;SYNC.base=fp(snapText());saveSync();
  render();
}

// Keuze als er lokale wijzigingen zijn én een planning op de server
function resolve(r){
  const laden=confirm(
    'Er staat een planning op de server. In deze browser staan gegevens die nog niet op de server staan '+
    '(bijvoorbeeld een Excel-import of een wijziging die niet is opgeslagen).\n\n'+
    'OK = de serverversie laden. De gegevens van deze browser worden als backup bewaard.\n'+
    'Annuleren = deze browser naar de server sturen. Dat overschrijft de servergegevens.');
  if(laden){adoptServer(r);toast('Serverversie geladen. Je lokale versie staat in de backup.')}
  else{SYNC.sv=r.version;saveSync();schedulePush()}
}

async function initSync(){
  if(!SERVER)return;
  let r;
  try{r=await withPw(()=>api('/api/state'))}
  catch(e){return}                          // geen server of geen /api: lokaal blijven werken, niets pushen
  if(r.data===null||r.data===undefined){    // server nog leeg: lokale planning wordt de eerste versie
    SYNC.sv=0;saveSync();schedulePush();return;
  }
  if(!pendingLocal()){adoptServer(r);return} // niets lokaal te verliezen
  resolve(r);                                // lokale wijzigingen én serverdata: eerst vragen
}

function schedulePush(){
  if(!SERVER||SYNC.sv===null)return;        // pas pushen als we de server kennen
  clearTimeout(PUSH_T);
  PUSH_T=setTimeout(pushState,500);
}

async function pushState(){
  if(PUSHING){PUSH_AGAIN=true;return}
  if(SYNC.sv===null)return;
  PUSHING=true;
  const text=JSON.stringify(D);
  let ok=false;
  try{
    const r=await withPw(()=>api('/api/state',{method:'PUT',body:'{"data":'+text+',"version":'+SYNC.sv+'}'}));
    SYNC.sv=r.version;SYNC.base=fp(snapText());saveSync();ok=true;
  }catch(e){
    if(e&&e.code==='srv'&&e.status===409){
      // Iemand anders heeft net opgeslagen: eerst vragen wat er moet gebeuren
      const r=await withPw(()=>api('/api/state')).catch(()=>null);
      if(r&&r.data)resolve(r);
      else toast('Opslaan mislukt. Je wijziging staat lokaal.');
    }else if(e&&e.code==='pw'){
      // het wachtwoordvenster is al getoond
    }else{
      toast('Opslaan op de server mislukt: '+(e&&e.message?e.message:'onbekende fout')+'. Je wijziging staat wel lokaal.');
    }
  }finally{
    PUSHING=false;
    // Na een geslaagde opslag direct nog eens als er inmiddels iets is gewijzigd. Bij een fout niet automatisch opnieuw (geen eindeloze lus).
    if(PUSH_AGAIN||(ok&&pendingLocal())){PUSH_AGAIN=false;schedulePush()}
  }
}
