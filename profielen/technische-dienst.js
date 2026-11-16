/* Profiel: technische dienst / onderhoud aan huis. Een opdracht is één klus (onderhoud of reparatie) bij een klant thuis. */
profielRegistreer({
  id:'technische-dienst',
  label:'Technische dienst (onderhoud aan huis)',
  titel:'Servicedienst Planner',
  woorden:{
    naam:'Servicedienst', slogan:'planning & onderhoud aan huis', appNaam:'Mijn Servicedienst',
    obj:'klus', objMv:'klussen', Obj:'Klus', ObjMv:'Klussen',
    objLang:'apparaat', objLangMv:'apparaten', objKort:'klussen', ObjLang:'Apparaat', ObjLangMv:'Apparaten',
    id:'ordernummer', idMv:'ordernummers', Id:'Ordernummer', idPh:'WO-20451',
    objVeld:'Apparaat', objVeldPh:'bijv. CV-ketel Remeha Avanta',
    werk:'onderhouden', werkTijd:'onderhoudstijd', Werk:'Onderhouden', werkZn:'onderhoud',
    type:'onderhoudssoort', Type:'Onderhoudssoort', Types:'Onderhoudssoorten', TypesUitleg:'Soorten onderhoud, duur en vaardigheden', TypeVeld:'Soort onderhoud',
    Opdrachten:'Onderhoudsopdrachten', opdrachtenUitleg:'Alle onderhoudsopdrachten zoeken en wijzigen',
    facturant:'woningcorporatie', Facturant:'Woningcorporatie', facturantGroep:'Woningcorporatie of verzekeraar', facturantVraag:'Komt de lijst van een woningcorporatie of verzekeraar (garantieservice)?',
    bedrijf:'een technische dienst die onderhoud en reparaties aan huis uitvoert',
    nietAanwezig:'Volgens de lijst gaat deze afspraak niet door.'
  },
  import:{ id:'ordernummer|order|werkbon|melding|ticket', obj:'apparaat|merk|model|klacht|installatie', objTitel:'klussen|werkbonnen|meldingen|orders' },
  redenen:['Klant niet thuis','Onderdeel niet op voorraad','Apparaat niet toegankelijk','Anders'],
  /* Onderhoudsafspraken duren vaak tot anderhalf uur: een tijdvak tot 90 minuten is nog een vaste afspraak */
  regels:{ slotMaxMin:90, kentekenplaat:false, facturatieViaDerde:true }
});
