# Rooktest Wasroute

Drie lagen. Laag 1 en 2 draaien automatisch in GitHub Actions vóór elke deploy vanaf de branch `azure`.
Faalt een test, dan gaat de nieuwe versie niet online.

| Laag | Wat | Hoe lang | Waar |
|---|---|---|---|
| 1. Motortests | Planningsregels en de drie Excel-testsets, incl. vergelijking met het exacte optimum | ± 10 s | `tests/engine/` |
| 2. Browsertests | Een planner die door de app klikt, plus de medewerker-app op een telefoonscherm | ± 30 s | `tests/e2e/` |
| 3. Handmatige checklist | Echte inlog, echte camera, echte reistijden, oordeel van een planner | ± 30 min | Doc "Rooktest Wasroute – handmatige checklist" |

## Lokaal draaien

Nodig: Node.js 22.

```bash
cd tests
npm ci
npx playwright install chromium     # eenmalig
npm test                            # laag 1 en 2
npm run motor                       # alleen laag 1
npm run browser                     # alleen laag 2
npx playwright show-report rapport  # rapport met schermopnamen bekijken
```

## Hoe de browsertest werkt

- `tests/server/server.mjs` start een testserver op http://localhost:4280.
  Die serveert de app en voert de **echte** functies uit `api/src/functions` uit.
  Alleen Azure Table/Blob Storage is vervangen door opslag in het geheugen (`tests/server/fakes`).
  Er wordt dus nooit een Azure-account of echte planning aangeraakt.
- De inlog is nagebootst (`/.auth/me`). De echte Microsoft-inlog test je in laag 3.
- Externe bronnen worden lokaal afgevangen, zodat de test niet van internet afhangt: de Excel-lezer en lettertypen in de browser,
  en PDOK in de testserver (antwoord in het echte PDOK-formaat met de coördinaten uit `tests/fixtures`).

## Wat er getest wordt

Motortests (`npm run motor`):
- Regressieset (TEST 1–5), met en zonder "pauze uiterlijk".
- Moeilijke set: acceptatiecriteria (10/10 bezoeken, ≤ 328 min, ≤ 286 km, ≤ 348 min niet-productief, 0 pauze niet gepland, 0 overwerk, niets gesplitst), gelijk aan het exacte optimum, stabiel bij herplannen, vastzetting, vaste pauze, rekentijd.
- Dagroute-set: R-801/R-802 onuitvoerbaar met de standaard werktijdregel, gelijk aan het optimum, 21/21 als de terugrit niet meetelt.
- Vijf planners, één dag (`testset_5_planners_1_dag.xlsx`): 42 van 46 beschikbare auto's = het exacte maximum met de werktijden van de voorbeeldmedewerkers; niets gesplitst; schrijfwijze en huisnummers juist.
- Repair-pass (diepte 1): een onbezet bezoek wordt alsnog gepland door één ander bezoek naar een andere medewerker te verplaatsen.
- Losse regels: bezoek als eenheid, `samePhysicalLocation()`, pauzeregels.

Browsertests (`npm run browser`):
1. Laden en automatisch plannen
2. Eén auto verplaatsen via "Verplaats naar…" → hele bezoek gaat mee
3. Eén auto slepen naar een andere medewerker → hele bezoek gaat mee
4. Medewerker ziek melden → bezoeken blijven heel
5. Vaste pauze per medewerker → planning eromheen
6. Excel importeren via het scherm: duur per auto (vast slot of venster), alles gepland
6b. Excel met vijf planners importeren: postcode in de adreskolom, 42 van 46 gepland, niets gesplitst
7. Keten: publiceren → medewerker meldt gereed met foto (telefoonscherm) → planner ziet foto → archiveren → foto's opschonen
8. Verlopen sessie → **bekend probleem**, gemarkeerd als "verwacht te falen". Zodra het is opgelost, slaagt de test en geeft Playwright een seintje om de markering weg te halen.

Profielen (`profielen/`):
- Profiel schoonmaak gebouwen kiezen in Beheer, Excel met ruimtecodes importeren, plannen, medewerker-app met eigen woorden en redenen.
- Scan: met het schoonmaakprofiel staat op geen enkel scherm, menu, formulier of tooltip nog een woord van het wasprofiel.

Bekende grens (gemarkeerd als TODO, telt niet als fout): dagroute met "pauze uiterlijk 13:30" zit circa 8% van het optimum, omdat daarvoor drie medewerkers tegelijk moeten ruilen.

## Een nieuwe testset toevoegen

1. Zet de Excel in `tests/fixtures/` en maak er een `.json` naast (zelfde opbouw als `moeilijk.json`: medewerkers, instellingen, opdrachten met coördinaten).
2. Schrijf de verwachtingen in een nieuw bestand `tests/engine/<naam>.test.mjs` (kijk naar `optimizer.test.mjs`).
