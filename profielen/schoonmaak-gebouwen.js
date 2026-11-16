/* Profiel: schoonmaak van gebouwen. Een opdracht is één ruimte of zone in een pand; een bezoek is een pand op één dag. */
profielRegistreer({
  id:'schoonmaak-gebouwen',
  label:'Schoonmaak gebouwen',
  titel:'Schoonmaakroute Planner',
  woorden:{
    naam:'Schoonmaakroute', slogan:'ploegen & routeplanning', appNaam:'Mijn Schoonmaakroute',
    obj:'ruimte', objMv:'ruimtes', Obj:'Ruimte', ObjMv:'Ruimtes',
    objLang:'ruimte', objLangMv:'ruimtes', objKort:'ruimtes', ObjLang:'Ruimte', ObjLangMv:'Ruimtes',
    id:'ruimtecode', idMv:'ruimtecodes', Id:'Ruimtecode', idPh:'GB-2.14',
    objVeld:'Ruimte of zone', objVeldPh:'bijv. kantoor 2e verdieping',
    werk:'schoonmaken', werkTijd:'schoonmaaktijd', Werk:'Schoonmaken', werkZn:'schoonmaak',
    type:'schoonmaaksoort', Type:'Schoonmaaksoort', Types:'Schoonmaaksoorten', TypesUitleg:'Soorten schoonmaak, duur en vaardigheden', TypeVeld:'Soort schoonmaak',
    Opdrachten:'Schoonmaakopdrachten', opdrachtenUitleg:'Alle schoonmaakopdrachten zoeken en wijzigen',
    facturant:'facilitair beheerder', Facturant:'Facilitair beheerder', facturantGroep:'Facilitair beheerder of eigenaar', facturantVraag:'Komt de lijst van een facilitair beheerder of vastgoedeigenaar?',
    bedrijf:'een schoonmaakbedrijf dat kantoren en gebouwen schoonmaakt',
    nietAanwezig:'Volgens de lijst is de ruimte niet beschikbaar.'
  },
  import:{ id:'ruimtecode|ruimte|zone|object', obj:'omschrijving|verdieping|zone|soort', objTitel:'ruimtes|zones|panden' },
  redenen:['Ruimte niet toegankelijk','Sleutel of pas ontbreekt','Ruimte in gebruik','Anders'],
  /* Schoonmaakrondes duren vaak langer dan een uur: een tijdvak tot 120 minuten is nog een vaste afspraak */
  regels:{ slotMaxMin:120, kentekenplaat:false, facturatieViaDerde:true }
});
