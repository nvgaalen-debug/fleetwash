# Wasroute Planner op Netlify

## Inhoud
- `index.html`: de planner (planning, kaart, import, Slim voorstel)
- `medewerker.html`: de mobiele app voor medewerkers
- `netlify/functions/planning.mjs`: publiceren van ritten en gereed-/probleemmeldingen (opslag in Netlify Blobs)
- `netlify/functions/ai-advies.mjs`: AI-advies via je Claude API-sleutel
- `netlify/functions/reistijden.mjs`: echte rijtijden via OpenRouteService (optioneel)
- `netlify/functions/adres.mjs`: exacte posities van adressen via PDOK (gratis, geen sleutel nodig)
- `package.json`: vertelt Netlify dat `@netlify/blobs` nodig is
- `netlify.toml`: waar de app en de functies staan

## Installeren (via GitHub; slepen naar Netlify Drop werkt niet voor de functies)
1. Zet alle bestanden en mappen in een GitHub-repository, met `index.html` in de hoofdmap.
2. Netlify: Add new site > Import an existing project > kies de repository. Laat het build command leeg.
3. Netlify: Site configuration > Environment variables:
   - `APP_PASSWORD` = een wachtwoord voor planners. Sterk aangeraden: zonder wachtwoord kan iedereen met het adres ritten publiceren en meldingen lezen.
   - `ANTHROPIC_API_KEY` = je Claude API-sleutel (alleen nodig voor AI-advies)
   - `ORS_API_KEY` = sleutel van openrouteservice.org (alleen nodig voor echte rijtijden; gratis account)
4. Deploys > Trigger deploy > Deploy site.

Netlify Blobs hoef je niet apart aan te zetten; het werkt automatisch op elke Netlify-site.

## Werken met de medewerker-app
1. Planner: Medewerkers > Kopieer link, en stuur de link naar de medewerker (bijv. via WhatsApp).
   De medewerker opent hem op de telefoon en kan hem op het beginscherm zetten.
2. Planner: Planning > Publiceer naar medewerkers (1, 7 of 14 dagen).
   Na wijzigingen staat er "Gewijzigd na publicatie"; publiceer dan opnieuw.
3. Medewerker: ziet per dag zijn bezoeken, adressen (met navigatie), locatie-info, inlog en opmerkingen,
   en meldt per auto Gereed of Probleem. Zonder bereik worden meldingen later verstuurd.
4. Planner: meldingen verschijnen automatisch (elke minuut) in de rit, de dagplanning en de opdrachtenlijst.

Telefoon kwijt of medewerker uit dienst? Medewerker bewerken > "Nieuwe link maken", en daarna publiceren.

## Echte rijtijden met OpenRouteService (optioneel)
1. Maak een gratis account op https://openrouteservice.org en kopieer je API-sleutel.
2. Netlify: voeg `ORS_API_KEY` toe en deploy opnieuw.
3. Planner: Instellingen > Bron voor reistijden > OpenRouteService > Opslaan, en klik op "Rijtijden ophalen".
4. Klik in Planning op "Automatisch plannen" om de planning op de echte rijtijden af te stemmen.
Nieuwe locaties? Op de Planning-pagina verschijnt "… rijtijden ophalen"; alleen wat ontbreekt wordt opgevraagd.
Het gratis abonnement heeft een daglimiet; de app haalt per keer alleen ontbrekende rijtijden op en bewaart ze.

## Exacte posities met PDOK
Werkt automatisch, zonder sleutel:
- Nieuwe locaties (formulier of klant aanmaken) krijgen na opslaan hun exacte positie via PDOK.
- Na een Excel-import loopt de app automatisch door: exacte posities (PDOK) > echte rijtijden (OpenRouteService, als die aan staat) > planning.
- Bestaande locaties: Klanten & locaties > "Posities verbeteren via PDOK".
Vindt PDOK een adres niet, dan blijft de geschatte positie staan en zie je bij de locatie waarom.
