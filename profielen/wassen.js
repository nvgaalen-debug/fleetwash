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
  regels:{ slotMaxMin:60, kentekenplaat:true, facturatieViaDerde:true },
  /* Standaard, ongewijzigd t.o.v. de app van vóór de profielen: dezelfde druppel, dezelfde kleur. */
  stijl:{
    accent:'#0a6a88',
    planner:'<path d="M13 2c4 5.2 7 9 7 12.6A7 7 0 0 1 6 14.6C6 11 9 7.2 13 2z" fill="var(--accent)"/><path d="M9.5 15.5c1.2 1.8 4.6 2.2 6.4-.4" fill="none" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round"/>',
    medewerker:'<path d="M13 2c4 5.2 7 9 7 12.6A7 7 0 0 1 6 14.6C6 11 9 7.2 13 2z" fill="currentColor"/>'
  }
});
