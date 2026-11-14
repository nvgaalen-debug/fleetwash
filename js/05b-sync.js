/* ---------- planning op de server (enige opslag; geen lokale kopie) ----------
   Uitgangspunt: wat op de server staat, is de planning. Er wordt niets lokaal bewaard.
   - Elke wijziging (handmatig, automatisch, AI, import) gaat direct naar /api/state.
   - Een wijziging geldt pas als de server die heeft bevestigd (versie opgehoogd).
   - Bij een conflict (iemand anders sloeg eerder op) of een fout wordt de serverversie opnieuw geladen
     en de niet-bewaarde wijziging weggegooid, met een melding. Geen stille overschrijving.
   - Zolang de planning niet van de server is geladen, is er niets te bewerken en wordt niets opgeslagen. */
let SYNC={sv:null};
let SYNC_READY=false;          // true zodra de serverplanning is geladen
let PUSH_P=null, PUSH_DIRTY=false;

// Wachtscherm of foutmelding in plaats van de planning
function setLaden(html){
  const v=$('#view');if(!v)return;
  v.innerHTML=`<section class="panel sec" style="margin-top:24px"><h2>Wasroute Planner</h2>${html}</section>`;
}
function startFout(msg){
  SYNC_READY=false;
  setLaden(`<p class="note" style="color:var(--bad)">${esc(msg)}</p><div class="row"><button class="btn primary" data-act="srvretry">Opnieuw proberen</button></div>`);
}

// Planning van de server in de app zetten (bij het opstarten: datum van vandaag)
function startMet(data,version){
  SYNC.sv=version;SYNC_READY=true;
  load(data);migrateBillTo();index();
  render();
}

// Serverversie overnemen tijdens gebruik: datum en weergave blijven zoals ze waren
function vervangDoorServer(data,version){
  SYNC.sv=version;D=data;
  LEGS.clear();index();
  D.workers.forEach(w=>{if(!w.token)w.token=randTok()});
  render();
}

async function initSync(){
  if(!SERVER)return;
  setLaden('<p class="note">Planning laden van de server…</p>');
  let r;
  try{r=await withPw(()=>api('/api/state'))}
  catch(e){startFout('De planning kan niet van de server worden geladen. '+apiErr(e));return}
  if(r.data===null||r.data===undefined){
    // Server nog leeg: de voorbeeldplanning wordt de eerste versie
    SYNC.sv=0;SYNC_READY=true;load(sample());migrateBillTo();index();render();pushState();
    return;
  }
  startMet(r.data,r.version);
}

// Opnieuw laden van de server na een conflict of fout. Wat niet bewaard is, gaat verloren.
async function herlaad(msg){
  let r;
  try{r=await withPw(()=>api('/api/state'))}
  catch(e){startFout(msg+' Opnieuw laden lukt ook niet: '+apiErr(e));return}
  if(r.data===null||r.data===undefined){startFout(msg+' De server heeft geen planning meer.');return}
  vervangDoorServer(r.data,r.version);
  toast(msg,9000);
}

// Alle wijzigingen naar de server. Terwijl er een opslag loopt, worden nieuwe wijzigingen één keer
// meegestuurd (geen parallelle schrijfacties, geen verlies van volgorde).
function pushState(){
  if(!SERVER||!SYNC_READY)return Promise.resolve();
  PUSH_DIRTY=true;
  if(!PUSH_P)PUSH_P=runPush().finally(()=>{PUSH_P=null});
  return PUSH_P;
}

async function runPush(){
  while(PUSH_DIRTY){
    PUSH_DIRTY=false;
    const ok=await stuurNu();
    if(!ok)break;
  }
}

async function stuurNu(){
  const text=JSON.stringify(D);
  try{
    const r=await withPw(()=>api('/api/state',{method:'PUT',body:'{"data":'+text+',"version":'+SYNC.sv+'}'}));
    SYNC.sv=r.version;
    return true;
  }catch(e){
    PUSH_DIRTY=false;
    if(e&&e.code==='pw'){toast('Niet opgeslagen: het wachtwoord is nodig. Vul het in en probeer het opnieuw.',7000);return false}
    if(e&&e.code==='srv'&&e.status===409){
      await herlaad('Iemand anders heeft de planning net opgeslagen. Je laatste wijziging is niet bewaard; de serverversie is geladen.');
      return false;
    }
    await herlaad('Opslaan op de server mislukt ('+(e&&e.message?e.message:'geen verbinding')+'). Je laatste wijziging is niet bewaard.');
    return false;
  }
}
