# Domeinprofielen

De planner is generiek: hij plant opdrachten met een locatie, een tijdvak, een duur en eventueel een vaardigheid.
Een **profiel** bepaalt wat de gebruiker ziet en hoe de import leest. Wisselen kan in
**Beheer > Planning en reistijd > Branche (profiel)**. Publiceer daarna opnieuw, dan volgt de medewerker-app.

| Profiel | Bestand | Een opdracht is | Herkenning in Excel | Vast tijdslot tot |
|---|---|---|---|---|
| Autowassen op locatie (standaard) | `wassen.js` | een auto, met kenteken | kolom "Kenteken" | 60 min |
| Schoonmaak gebouwen | `schoonmaak-gebouwen.js` | een ruimte of zone, met ruimtecode | kolom "Ruimtecode", "Ruimte" of "Zone" | 120 min |
| Technische dienst (onderhoud aan huis) | `technische-dienst.js` | een klus bij een klant thuis, met ordernummer | kolom "Ordernummer", "Order", "Werkbon" of "Melding" | 90 min |

## Een profiel toevoegen

1. Kopieer `schoonmaak-gebouwen.js` naar `<branche>.js` en geef het een eigen `id` en `label`.
2. Pas de **woorden** aan. Elke sleutel is een woord dat ergens in de app staat:
   - `obj`/`objMv`/`Obj`/`ObjMv`: wat er bediend wordt (auto, auto's)
   - `objLang`/`objLangMv`/`objKort`: de lange vorm en de afkorting in de dagplanning (voertuig, voertuigen, voert.)
   - `id`/`idMv`/`Id`/`idPh`: het nummer per opdracht en een voorbeeld (kenteken, AB-123-C)
   - `werk`/`werkTijd`/`Werk`/`werkZn`: het werk (reinigen, reinigingstijd)
   - `type`/`Type`/`Types`/`TypesUitleg`/`TypeVeld`: de werksoorten in Beheer
   - `facturant`…: wie de factuur krijgt als de lijst van een derde komt (leasemaatschappij)
   - `bedrijf`: één zin voor het AI-advies ("een bedrijf dat …")
   - `naam`/`slogan`/`appNaam`: titel van de planner en van de medewerker-app
3. **import**: reguliere expressies voor de kolomnamen (`id` = de kolom met het nummer, `obj` = omschrijving).
4. **redenen**: de keuzes in de medewerker-app als een opdracht niet lukt.
5. **regels**: `slotMaxMin` (begin- en eindtijd tot zoveel minuten = vaste afspraak, langer = tijdvak),
   `kentekenplaat` (gele NL-plaat of gewone code).
6. Laad het bestand in `index.html`, `medewerker.html` en `tests/engine/lib.mjs`, naast de andere profielen.
7. **Voorbeelddata** (de knop "Voorbeelddata herstellen" in Beheer): voeg een eigen `sample<Naam>()`-functie toe in
   `js/01-kern.js`, naar het voorbeeld van `sampleSchoonmaak()` of `sampleTechnischeDienst()`, en voeg hem toe aan de
   if-reeks in `sample()`. Zonder eigen voorbeelddata krijgt het profiel de wasset.
8. Voeg een testset toe in `tests/fixtures/` en een browsertest naar het voorbeeld van `tests/e2e/schoonmaak.profiel.spec.mjs`
   of `tests/e2e/technische-dienst.profiel.spec.mjs`. De bijbehorende `*.scan.spec.mjs` laat zien hoe je controleert dat
   er geen woorden van een ander profiel achterblijven (let op: sluit `#set_profiel` uit, die somt bewust alle profielen op).

Ontbreekt een woord in een profiel, dan valt de app terug op het woord uit `wassen.js`.
