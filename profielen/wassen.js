/* Profiel: autowassen op locatie (Wasroute). Dit is het standaardprofiel; de app ziet er hiermee uit zoals altijd. */
profielRegistreer({
  id:'wassen',
  label:'Autowassen op locatie',
  titel:'Wasroute Planner',
  woorden:{
    naam:'Wasroute', slogan:'dispatch & routeplanning', appNaam:'Mijn Wasroute',
    obj:'auto', objMv:"auto's", Obj:'Auto', ObjMv:"Auto's",
    objLang:'voertuig', objLangMv:'voertuigen', objKort:'voert.', ObjLang:'Voertuig', ObjLangMv:'Voertuigen',
    id:'kenteken', idMv:'kentekens', Id:'Kenteken', idPh:'AB-123-C',
    objVeld:'Voertuig', objVeldPh:'Merk en model',
    werk:'reinigen', werkTijd:'reinigingstijd', Werk:'Reinigen', werkZn:'reiniging',
    type:'reinigingstype', Type:'Reinigingstype', Types:'Reinigingstypes', TypesUitleg:'Soorten reiniging, duur en vaardigheden', TypeVeld:'Type reiniging',
    Opdrachten:'Reinigingsopdrachten', opdrachtenUitleg:'Alle reinigingsopdrachten zoeken en wijzigen',
    facturant:'leasemaatschappij', Facturant:'Leasemaatschappij', facturantGroep:'Leasemaatschappij of verhuurder', facturantVraag:'Komt de lijst van een lease- of verhuurmaatschappij?',
    bedrijf:"een bedrijf dat auto's reinigt op de locatie van klanten",
    nietAanwezig:'Volgens de lijst kon de auto niet.'
  },
  /* Wat telt als kolomnaam in een Excel-lijst (reguliere expressies, hoofdletterongevoelig) */
  import:{ id:'kenteken', obj:'voertuig|merk|model|soort', objTitel:"auto['’]?s|voertuigen|wagens|leasewagens|bedrijfswagens" },
  /* Redenen in de medewerker-app als een opdracht niet lukt */
  redenen:['Auto niet aanwezig','Geen toegang tot de locatie','Schade of niet goed te reinigen','Anders'],
  regels:{ slotMaxMin:60, kentekenplaat:true, facturatieViaDerde:true }
});
