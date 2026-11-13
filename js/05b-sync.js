/* ---------- gedeelde planning op de server (Azure Table Storage via /api/state) ----------
   Lokaal (localStorage) blijft de kopie die direct werkt. Na elke wijziging gaat de planning
   naar de server. Bij openen haalt de app de server-versie op. Stuurt iemand anders in de
   tussentijd een nieuwere versie, dan krijg je een melding en laadt de app de servergegevens. */
let SV=null;            // versie op de server die we laatst zagen (null = nog niet verbonden)
let PUSH_T=null, PUSHING=false, PUSH_AGAIN=false;

// Haalt de planning van de server en zet die in de app. Geeft true als het gelukt is.
async function pullState(){
  if(!SERVER)return false;
  try{
    const r=await withPw(()=>api('/api/state'));
    if(r.data){
      localStorage.setItem(KEY,JSON.stringify(r.data));
      SV=r.version;
      return true;
    }
    // Nog niets op de server: de lokale kopie wordt de eerste versie.
    SV=0;
    return false;
  }catch(e){
    if(e&&e.code==='nofn')return false;   // deze site heeft geen /api/state
    return false;                         // server niet bereikbaar: lokaal blijven werken
  }
}

function initSync(){
  if(!SERVER)return;
  pullState().then(ok=>{
    if(ok){
      try{load();migrateBillTo();index();render()}catch(err){console.warn('sync laden',err)}
    }
    if(SV===0)schedulePush();              // eerste keer: lokale gegevens naar de server
  });
}

function schedulePush(){
  if(!SERVER||SV===null)return;            // alleen pushen als we de server kennen
  clearTimeout(PUSH_T);
  PUSH_T=setTimeout(pushState,500);
}

async function pushState(){
  if(PUSHING){PUSH_AGAIN=true;return}
  PUSHING=true;
  try{
    const r=await withPw(()=>api('/api/state',{method:'PUT',body:JSON.stringify({data:D,version:SV||0})}));
    SV=r.version;
  }catch(e){
    if(e&&e.code==='srv'&&e.status===409){
      toast('Iemand heeft de planning net gewijzigd. De servergegevens worden geladen.');
      PUSH_AGAIN=false;
      await pullState();
      try{load();migrateBillTo();index();render()}catch(err){}
    }else if(e&&e.code==='pw'){
      // wachtwoord-dialoog is al getoond door withPw
    }else{
      toast('Opslaan op de server mislukt. Je wijziging staat wel lokaal.');
    }
  }finally{
    PUSHING=false;
    if(PUSH_AGAIN){PUSH_AGAIN=false;schedulePush()}
  }
}
