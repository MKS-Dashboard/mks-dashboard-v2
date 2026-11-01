# MKS Dashboard

Een Windows-app met overzicht over je Meldkamerspel-account, voertuigen, gebouwen en team.

De app draait op je eigen pc en haalt je gegevens rechtstreeks op bij Meldkamerspel.

## Downloaden en installeren

**Benodigd:** Windows 10 of nieuwer en een internetverbinding. Je hoeft geen extra software te installeren.

| Versie | Download | Voor wie? |
|---|---|---|
| **Stable — MKS Dashboard** | [Download Stable](https://github.com/MKS-Dashboard/mks-dashboard-v2/raw/refs/heads/main/install/MKS-Dashboard-Setup-Stable.exe) | Voor dagelijks gebruik |
| **Beta — MKS Dashboard Beta** | [Download Beta](https://github.com/MKS-Dashboard/mks-dashboard-v2/raw/refs/heads/dev/install/MKS-Dashboard-Setup-Beta.exe) | Voor het uitproberen van nieuwe functies |

1. Kies hierboven **Stable** of **Beta** en open het gedownloade bestand.
2. Het installatieprogramma downloadt automatisch de nieuwste versie.
3. Volg de installatiewizard en start MKS Dashboard.

Je kunt de volledige installer ook zelf downloaden via [GitHub Releases](https://github.com/MKS-Dashboard/mks-dashboard-v2/releases). Kies voor Beta een release die als **Pre-release** is gemarkeerd.

Stable en Beta kunnen naast elkaar worden geïnstalleerd. Ze hebben afzonderlijke instellingen en opgeslagen sessies. Beta kan nog onvoltooide functies of fouten bevatten.

> De installers zijn niet digitaal ondertekend. Windows kan daarom een beveiligingswaarschuwing tonen. Download uitsluitend uit deze repository.

## Aan de slag

Voer bij de eerste start je Meldkamerspel-SessionID in. Je kunt deze versleuteld op je pc bewaren, zodat de app bij een volgende start automatisch je gegevens probeert op te halen.

Op het aanmeldscherm staat **De app verzamelt gebruiksgegevens**. Onder **Meer details** lees je welke gegevens worden verstuurd en waarom. Deze uitleg is ook beschikbaar via **Gebruikersmenu > Over de app**.

Onder het SessionID-veld vind je **Hoe vind ik mijn SessionID?** met instructies voor Chrome, Edge en Firefox:

1. Log in op `https://meldkamerspel.com` in je browser en open de ontwikkelaarstools met **F12**.
2. Ga in Chrome/Edge naar **Application (Applicatie) > Storage (Opslag) > Cookies**, of in Firefox naar **Storage (Opslag) > Cookies**. Selecteer de Meldkamerspel-website.
3. Kopieer alleen de **Value (Waarde)** van de cookie `_session_id` en plak deze in de app.

Behandel deze waarde als een wachtwoord en deel deze nooit, ook niet in screenshots of foutrapporten.

Na een succesvolle aanmelding verschijnen de accountgebonden overzichten. Rechtsboven vind je het gebruikersmenu:

- **Gegevens ophalen:** vernieuw je dashboard handmatig.
- **Details:** bekijk je accountgegevens, saldo, rang en ranglijstpositie.
- **Instellingen:** pas het automatisch vernieuwen aan.
- **Over de app:** bekijk je appversie, Stable of Beta, privacyinformatie, gegevensbronnen en links naar het project, releaseopmerkingen en bijdragers.
- **Updates controleren:** controleer of een nieuwe appversie beschikbaar is.
- **Uitloggen:** wis de sessie en opgehaalde gegevens uit de app. Gebruik dit ook om van account te wisselen.

### Overzichten

Het overzicht begroet je met je spelersnaam en toont voertuigen, gebouwen, credits en coins. Via de statistiekkaarten en snelle acties open je direct de bijbehorende pagina's. Je ziet ook wanneer gegevens voor het laatst zijn opgehaald en of automatisch vernieuwen aanstaat.

- **Voertuigen:** aantallen per hulpdienst, voertuigtype en groep, inclusief extra waarden zoals watercapaciteit.
- **Equipment:** aantallen per categorie en type, met grootte en aantallen voertuigkoppelingen. Onbekende of niet-ingedeelde typen staan onder Overige.
- Via **Details** bij een equipmenttype zie je alleen de items van dat type, met ID, locatie en voertuigkoppelingen. Gebruik **Terug naar overzicht** om alle typen weer te bekijken.
- Voertuigdetails en equipmentdetails hebben dezelfde zoekbare en sorteerbare opzet, met de terugknop naast de paginakop. Voertuig-ID's worden zonder duizendtalscheiding getoond; met het knopje naast het ID open je het voertuig in je browser.
- **Gebouwen:** gebouwtypen, uitbreidingen, specialisaties en opleidingen.
- **Capaciteit:** bezette en vrije ziekenhuisbedden, cellen en klaslokalen.

- **Team:** teamgegevens, teamkas, leden, gebouwen en teamopleidingen.
- **Account:** spelersnaam, credits, coins, rang en ranglijstpositie.

Progressdata heeft bovenaan een toggle voor **Normaal** (de bestaande voortgangsbalken) en **Compact** (cirkeldiagrammen met eigen en teamcapaciteit). Je keuze wordt lokaal onthouden, ook na het herstarten van de app; standaard is Normaal. Compact toont op brede schermen vier kaarten naast elkaar, inclusief bezetting, vrije plaatsen en totalen. Op kleinere schermen worden de kaarten over minder kolommen verdeeld.

Welke gegevens je ziet, hangt af van je account en de gegevens die Meldkamerspel beschikbaar stelt.

### Automatisch vernieuwen

Automatisch vernieuwen staat standaard **aan**, met een interval van **5 minuten**. In **Gebruikersmenu > Instellingen** kun je dit uitschakelen of een ander interval instellen: een geheel aantal minuten, minimaal 1.

Ook als automatisch vernieuwen uitstaat, kun je altijd **Gegevens ophalen** gebruiken. Je gekozen interval blijft bewaard.

Dit interval geldt voor gamegegevens, niet voor app-updates.

### Een foutrapport maken

Werkt iets niet goed? Kies **Instellingen > Genereer error rapport**. Het rapport verzamelt informatie over fouten en ontbrekende spelgegevens, zodat we het probleem beter kunnen onderzoeken.

Je kunt het rapport bekijken, kopiëren of als tekstbestand opslaan. Dit werkt in Stable en Beta. Controleer het rapport op persoonlijke of gevoelige informatie voordat je het deelt.

## Updates

De app controleert bij het starten en vervolgens iedere vier uur op een nieuwe versie. Je kunt ook zelf **Updates controleren** kiezen.

Controleren downloadt of installeert niets. Klik op **Bijwerken** om de update uit te voeren:

1. De app toont de downloadvoortgang.
2. De app sluit en de installer toont de installatievoortgang.
3. De nieuwe versie start automatisch.

Een al gedownloade update installeer je met **Herstarten en bijwerken**. Updates worden niet bij normaal afsluiten geïnstalleerd. Windows kan om beheerdersrechten vragen als de installatie die nodig heeft.

Stable ontvangt uitsluitend Stable-updates; Beta uitsluitend Beta-updates. Er wordt niet automatisch van kanaal gewisseld.

## Privacy en verbinding

- De app leest je spelgegevens en wijzigt niets in je spelaccount.
- Je SessionID wordt alleen naar Meldkamerspel gestuurd, niet naar GitHub of de makers van het dashboard.
- Als je **Bewaar de SessionID versleuteld op deze pc** kiest, wordt deze beveiligd op je pc bewaard.
- Updates en aanvullende openbare informatie worden via GitHub opgehaald.
- Bij aanmelden worden je speler-ID, spelersnaam, appversie en of je Beta gebruikt automatisch naar de developer gestuurd om eerste en laatste gebruik bij te houden. Je SessionID en overige spelgegevens worden niet meegestuurd.
- Per account en installatie wordt maximaal eenmaal succesvol per kalenderdag (Nederlandse tijd) geregistreerd. Bij een fout probeert de app het bij een volgende gegevensverversing opnieuw; het dashboard blijft bruikbaar.
- Voor het ophalen van gegevens en updates heb je internet nodig.

**Behandel je SessionID als een wachtwoord en deel deze nooit.** De app is afhankelijk van de beschikbaarheid en voorwaarden van de [Meldkamerspel-API](https://www.meldkamerspel.com/api-infos).

Voor vragen over de gebruiksregistratie of een verwijderingsverzoek kun je contact opnemen via [GitHub Issues](https://github.com/MKS-Dashboard/mks-dashboard-v2/issues). Deel daar geen SessionID of andere gevoelige informatie.

## Extra functies in Beta

In Beta kun je via **Instellingen > Infoblocks** extra informatiepagina's inschakelen: missies, geplande en grote teammissies, evenementen, teamevents, POI's, onderscheidingen, informatie, credits per spelversie en suggesties.

Deze optie staat standaard uit en is niet beschikbaar in Stable. Beta heeft ook een technische **Dev mode** voor probleemonderzoek; uitleg staat in de [ontwikkelaarshandleiding](dev.md#probleemonderzoek).

## Hulp en problemen melden

Meld fouten of wensen via [GitHub Issues](https://github.com/MKS-Dashboard/mks-dashboard-v2/issues). Vermeld je appversie, Stable of Beta, en de stappen waarmee het probleem optreedt. Deel geen SessionID of ongecontroleerde accountgegevens.

Lukt aanmelden of gegevens ophalen niet, controleer dan je internetverbinding en probeer opnieuw. Een opgeslagen SessionID blijft bij een verbindingsfout bewaard. Als de app na een update niet automatisch start, open deze via het Windows-startmenu.

Heb je een oudere Dev-installatie die nog **MKS Dashboard** heet? Vervang die eenmalig door de nieuwe Beta-installatie voordat je Stable daarnaast installeert. Voer je SessionID opnieuw in voor Beta.

## Voor ontwikkelaars

Wil je de app zelf draaien, aanpassen of bouwen? Zie [dev.md](dev.md) voor technische informatie, tests en releaseonderhoud.
