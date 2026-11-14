# Wasroute Planner: gebruikershandleiding

Deze handleiding beschrijft hoe je de planner dagelijks gebruikt. Voor installatie, Netlify en koppelingen (OpenRouteService, PDOK, Business Central, medewerker-app) zie `LEESMIJ.md`.

## 1. Opslag
- Alle gegevens staan op de server. Er wordt niets meer lokaal opgeslagen, dus je ziet op elk apparaat dezelfde planning.
- Elke wijziging (handmatig, import of AI) gaat direct naar de server.
- Werkt iemand anders tegelijk aan dezelfde planning en is die eerder opgeslagen, dan laadt de app de serverversie opnieuw in en verschijnt de melding "Iemand anders heeft de planning net opgeslagen". Controleer daarna je wijziging en voer hem opnieuw in als dat nodig is.
- Verschijnt "Opslaan op de server mislukt", dan is de wijziging niet bewaard. Probeer het opnieuw.

## 2. De dagplanning
Op de pagina **Planning** zie je per dag:
- Een rij per medewerker, met de bezetting, reistijd en het aantal bezoeken.
- Blokken: **reinigen** (donker), **rijden** (gestreept), **wachten op tijdvenster**, **pauze** (P) en het **terugrijden** aan het einde.
- Een te laat bezoek of een overschreden werktijd krijgt een rode markering.
- Klik op de naam van een medewerker om het **ritpaneel** te openen. Daar zie je de volgorde van de bezoeken, de tijden en de knoppen voor die medewerker.

Een bezoek verplaatsen kan door het blok naar een andere medewerker te slepen. Daarna wordt de planning van die medewerker opnieuw berekend.

## 3. Automatisch plannen
- Klik op **Automatisch plannen** om de dag opnieuw te verdelen. Daarbij blijven vastgezette afspraken staan.
- Medewerkers met een handmatige wijziging (zie hieronder) houden hun route. De andere medewerkers worden opnieuw ingepland, en niet-ingeplande afspraken komen bij hen terecht.
- Lukt een afspraak niet, dan staat er in de opdrachtenlijst de reden. Die melding kan ook betekenen dat de medewerker die dag niet genoeg tijd heeft.

## 4. Vastzetten en handmatige wijzigingen
- Een afspraak die je op een **gekozen tijd** of in een **gekozen rit** zet, wordt vastgezet. Bij automatisch plannen blijft die afspraak dan op die plek en tijd.
- Een afspraak die je op de **beste plek** in de rit zet, wordt niet vastgezet. Die kan de planner later nog verplaatsen.
- Een medewerker waarbij je zelf iets hebt aangepast (slepen, de volgorde optimaliseren, een afspraak vastzetten), krijgt een handmatige markering. Bij herplannen blijft die medewerker dan staan.
- **Vastzetting opheffen** in een afspraak (dialoog van de opdracht) heft alleen de vastzetting van die afspraak op. De planning wordt daarna opnieuw berekend.
- **Vastzetten opheffen** in de balk boven de dagplanning heft alle vastzettingen en handmatige markeringen van die dag op. De planning verandert pas als je daarna op **Automatisch plannen** klikt.
- De dag heeft de markering **Handmatig aangepast** zolang er vastzettingen of handmatige wijzigingen op die dag staan.

## 5. Een nieuwe afspraak toevoegen
Klik op **Nieuwe afspraak** en kies een van de drie opties:
- **Automatisch plannen**: de app kiest de medewerker.
- **Op de beste plek in de rit**: de afspraak komt op de plek met de minste extra reistijd, bij de gekozen medewerker. Hij wordt niet vastgezet.
- **Op een gekozen tijd**: de afspraak wordt vastgezet op dat tijdstip bij de gekozen medewerker.

Zoek je een klant of locatie die nog niet bestaat, gebruik dan **+ Nieuwe klant of locatie** in het zoekveld. Na opslaan keert de app terug naar je opdracht, met de ingevulde gegevens.

## 6. Pauzes
Er zijn twee manieren om pauzes te regelen.

**Algemene pauzeregel** (Beheer > Planning en reistijd). Die geldt voor alle medewerkers:
- **Pauze (min)**: de duur. 0 betekent geen pauze.
- **Pauze vanaf**: de pauze begint niet eerder dan dit tijdstip.
- **Pauze uiterlijk**: de pauze begint uiterlijk op dit tijdstip, ook als een vaste afspraak daardoor later wordt. Bij 13:30 en 30 minuten loopt de pauze dus tot 14:00. Leeg betekent geen grens.
- Een pauze wordt bij voorkeur in een wachttijd of tussen twee bezoeken gezet. Er wordt niet in een rit gepauzeerd.

**Pauze per medewerker en per dag** (in het ritpaneel, knop **Pauze deze dag**):
- Je stelt de duur, het venster (vanaf en uiterlijk) en eventueel een **vast startmoment** in. Die instellingen gelden alleen voor die medewerker op die dag.
- Een vast startmoment blijft staan bij automatisch plannen. Bezoeken, reistijd en wachttijd worden eromheen gepland.
- Met de knop **Pauze deze dag** kun je een pauze ook verwijderen. Daarna geldt weer de algemene regel.

Je hoeft dit per dag niet in te stellen. De algemene regel geldt zolang je niets per medewerker opgeeft.

## 7. Werktijd en volgorde op één dag
- **Werktijd deze dag** (ritpaneel): wijkt de werktijd van een medewerker op die dag af, dan stel je dat hier in. De afwijking wordt gemarkeerd.
- **Volgorde optimaliseren** (ritpaneel): zet de bezoeken van die medewerker in de kortste volgorde. De vastgezette afspraken blijven op hun plek.

## 8. Feestdagen
Onder Beheer > Planning en reistijd vink je de feestdagen aan waarop niemand werkt. Op die dagen wordt niets ingepland.

## 9. Importeren uit Excel
- Importeer een bestand en de app plant de nieuwe afspraken in. Daarna volgt de automatische planning (zie punt 3).
- Heb je een tijd ingevuld in de Excel, dan wordt die tijd als vaste tijd gezien.
- Na een import loopt de app automatisch door: exacte posities via PDOK, dan echte rijtijden (als OpenRouteService aanstaat), en dan de planning.

## 10. Berichten
- Stuur een bericht via **Planning > Berichten**, of in een bezoek via **Bericht aan …**. Je kiest één medewerker of meerdere, en kunt een urgent bericht markeren.
- Je ziet per bericht wanneer het is gelezen. Antwoorden van medewerkers verschijnen met een rode teller bij Planning en Berichten.

## 11. Archief
Dagen die je niet meer nodig hebt, zet je in het **archief**. Gearchiveerde dagen tellen niet meer mee in de planning.

## 12. Veelgestelde vragen

**Een afspraak wordt niet ingepland, terwijl medewerkers een lege agenda hebben.**
Controleer of de dag de markering "Handmatig aangepast" heeft. Klik op **Automatisch plannen**. Blijft de afspraak onbemand, dan is er mogelijk geen medewerker die hem binnen de werktijd kan doen. Lees de reden in de opdrachtenlijst.

**De pauze komt niet in het venster.**
Er is in dat venster geen wachttijd of pauzemoment tussen twee bezoeken. Een pauze midden in een rit wordt niet gepland. Verschuif een bezoek of zet een vast startmoment bij die medewerker.

**Mijn wijziging is verdwenen.**
Waarschijnlijk heeft iemand anders tegelijk opgeslagen. Controleer de planning en voer je wijziging opnieuw in.
