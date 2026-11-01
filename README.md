# MKS Dashboard

Een Windows-desktopapp met overzicht over je Meldkamerspel-account, voertuigen, gebouwen en team. Gebaseerd op [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev).

De app draait op je eigen pc en haalt gamegegevens rechtstreeks op bij Meldkamerspel, zonder de MKS-proxy van de webapp.

## Downloaden en installeren

**Benodigd:** Windows 10 of nieuwer en een internetverbinding. Node.js is niet nodig om de app te gebruiken.

| Versie | Download | Voor wie? |
|---|---|---|
| **Stable — MKS Dashboard** | [Download Stable](https://github.com/MKS-Dashboard/mks-dashboard-v2/raw/refs/heads/main/install/MKS-Dashboard-Setup-Stable.exe) | Voor dagelijks gebruik |
| **Beta — MKS Dashboard Beta** | [Download Beta](https://github.com/MKS-Dashboard/mks-dashboard-v2/raw/refs/heads/dev/install/MKS-Dashboard-Setup-Beta.exe) | Voor het uitproberen van nieuwe functies |

1. Download en open de kleine installer voor jouw versie.
2. De installer downloadt de nieuwste volledige installer van GitHub en controleert het bestand.
3. Volg de installatiewizard en start MKS Dashboard.

Je kunt de volledige installer ook zelf downloaden via [GitHub Releases](https://github.com/MKS-Dashboard/mks-dashboard-v2/releases). Kies voor Beta een release die als **Pre-release** is gemarkeerd.

Stable en Beta kunnen naast elkaar worden geïnstalleerd. Ze hebben afzonderlijke instellingen en opgeslagen sessies. Beta kan nog onvoltooide functies of fouten bevatten.

> De installers zijn niet digitaal ondertekend. Windows kan daarom een beveiligingswaarschuwing tonen. Download uitsluitend uit deze repository.

## Aan de slag

Voer bij de eerste start je Meldkamerspel-SessionID in. Je kunt deze versleuteld op je pc bewaren, zodat de app bij een volgende start automatisch je gegevens probeert op te halen.

Onder het SessionID-veld vind je **Hoe vind ik mijn SessionID?** met instructies voor Chrome, Edge en Firefox:

1. Log in op `https://meldkamerspel.com` in je browser en open de ontwikkelaarstools met **F12**.
2. Ga in Chrome/Edge naar **Application (Applicatie) > Storage (Opslag) > Cookies**, of in Firefox naar **Storage (Opslag) > Cookies**. Selecteer de Meldkamerspel-website.
3. Kopieer alleen de **Value (Waarde)** van de cookie `_session_id` en plak deze in de app.

Behandel deze waarde als een wachtwoord en deel deze nooit, ook niet in screenshots of foutrapporten.

Na een succesvolle aanmelding verschijnen de accountgebonden overzichten. Rechtsboven vind je het gebruikersmenu:

- **Gegevens ophalen:** vernieuw je dashboard handmatig.
- **Details:** bekijk je accountgegevens, saldo, rang en ranglijstpositie.
- **Instellingen:** pas het automatisch vernieuwen aan.
- **Updates controleren:** controleer of een nieuwe appversie beschikbaar is.
- **Uitloggen:** wis de sessie en opgehaalde gegevens uit de app. Gebruik dit ook om van account te wisselen.

### Overzichten

- **Voertuigen:** aantallen per hulpdienst, voertuigtype en groep, inclusief extra waarden zoals watercapaciteit.
- **Gebouwen:** gebouwtypen, uitbreidingen, specialisaties en opleidingen.
- **Capaciteit:** bezette en vrije ziekenhuisbedden, cellen en klaslokalen.
- **Team:** teamgegevens, teamkas, leden, gebouwen en teamopleidingen.
- **Account:** spelersnaam, credits, coins, rang en ranglijstpositie.

De beschikbare gegevens zijn afhankelijk van wat de Meldkamerspel-API voor je account aanbiedt.

### Automatisch vernieuwen

Automatisch vernieuwen staat standaard **aan**, met een interval van **5 minuten**. In **Gebruikersmenu > Instellingen** kun je dit uitschakelen of een ander interval instellen: een geheel aantal minuten, minimaal 1.

Als automatisch vernieuwen uitstaat, is het intervalveld uitgeschakeld en blijft de gekozen waarde bewaard. Handmatig ophalen blijft beschikbaar. Automatisch ophalen gebeurt alleen met een actieve sessie; handmatig ophalen begint het interval opnieuw.

Dit interval geldt voor gamegegevens, niet voor app-updates.

### Errorrapport

Via **Instellingen > Genereer error rapport** maak je een momentopname van de beschikbare foutstatussen en de laatst opgehaalde gegevens. Het rapport vermeldt onbekende voertuigtypen, gebouwtypen en specialisaties, verwerkingsfouten, mislukte gegevensverzoeken, updatefouten en overige waargenomen appfouten. Die laatste kunnen inmiddels zijn opgelost.

Je kunt het rapport in de app bekijken, kopieren of als tekstbestand downloaden. Dit werkt in Stable en Beta en doet geen extra API-verzoeken. Nog niet opgehaalde bronnen kunnen niet worden beoordeeld. Volledige responses worden niet opgenomen en SessionID-parameters worden afgeschermd. Controleer foutmeldingen op overige gevoelige informatie voordat je het rapport deelt. Waargenomen fouten worden alleen in het geheugen bewaard en bij uitloggen gewist.

## Updates

De app controleert bij het starten en vervolgens iedere vier uur op een nieuwe versie. Je kunt ook zelf **Updates controleren** kiezen.

Controleren downloadt of installeert niets. Klik op **Bijwerken** om de update uit te voeren:

1. De app toont de downloadvoortgang.
2. De app sluit en de installer toont de installatievoortgang.
3. De nieuwe versie start automatisch.

Een al gedownloade update installeer je met **Herstarten en bijwerken**. Updates worden niet bij normaal afsluiten geïnstalleerd. Windows kan om beheerdersrechten vragen als de installatie die nodig heeft.

Stable ontvangt uitsluitend Stable-updates; Beta uitsluitend Beta-updates. Er wordt niet automatisch van kanaal gewisseld.

## Privacy en verbinding

- Game-API-verzoeken worden lokaal uitgevoerd en zijn alleen-lezen.
- Je SessionID wordt uitsluitend bij gameverzoeken naar Meldkamerspel gestuurd, niet naar de MKS-proxy of GitHub.
- Optioneel wordt je SessionID versleuteld opgeslagen met de Windows-beveiliging.
- GitHub wordt gebruikt voor app-updates en, bij de aanvullende Beta-pagina's, openbare gegevens en suggesties. Deze verzoeken bevatten geen SessionID.
- Voor actuele gamegegevens, downloads en openbare gegevens is internet nodig. Lokaal draaien betekent niet volledig offline werken.

**Behandel je SessionID als een wachtwoord en deel deze nooit.** De app is afhankelijk van de beschikbaarheid en voorwaarden van de [Meldkamerspel-API](https://www.meldkamerspel.com/api-infos).

## Extra functies in Beta

Beta gebruikt intern het **Dev**-kanaal. De volgende opties staan standaard uit en zijn niet beschikbaar in Stable:

- **Instellingen > Infoblocks:** aanvullende openbare pagina's voor missies, geplande en grote teammissies, evenementen, teamevents, POI's, onderscheidingen, informatie, credits per spelversie en suggesties.
- **Instellingen > Dev mode:** de pagina **Raw API-responses** voor probleemonderzoek. Deze toont de laatst opgehaalde responses zonder extra verzoeken of opslag op schijf. De SessionID in de getoonde verzoek-URL is afgeschermd.

Raw responses kunnen account- en teamgegevens bevatten. Controleer de inhoud voordat je deze deelt.

## Hulp en problemen melden

Meld fouten of wensen via [GitHub Issues](https://github.com/MKS-Dashboard/mks-dashboard-v2/issues). Vermeld je appversie, Stable of Beta, en de stappen waarmee het probleem optreedt. Deel geen SessionID of ongecontroleerde accountgegevens.

Lukt aanmelden of gegevens ophalen niet, controleer dan je internetverbinding en probeer opnieuw. Een opgeslagen SessionID blijft bij een verbindingsfout bewaard. Als de app na een update niet automatisch start, open deze via het Windows-startmenu.

Heb je een oudere Dev-installatie die nog **MKS Dashboard** heet? Vervang die eenmalig door de nieuwe Beta-installatie voordat je Stable daarnaast installeert. Voer je SessionID opnieuw in voor Beta.

## Ontwikkeling en onderhoud

De app gebruikt Electron, React en TypeScript. Voor ontwikkeling heb je Node.js 24 met npm nodig.

```powershell
npm ci
npm run dev
```

Tests en een Windows-installer bouwen:

```powershell
npm test
npm run dist -- --publish never
```

De installer verschijnt in [release](release). `npm run dist` voert ook de typecontrole en appbuild uit. Deze zijn afzonderlijk beschikbaar als `npm run typecheck` en `npm run build`.

### Gamecatalogus

De vaste JSON-catalogi blijven in [src/renderer/src/data](src/renderer/src/data), per gegevenssoort opgesplitst. Rekenregels blijven in de app. Cataloguswijzigingen worden via een nieuwe appversie verspreid.

De uitgangsgegevens komen uit de [webapp op commit 8ec5374](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/8ec537480f00a71c583c8fc3513426d2cacde021/src/Lists). Behoud bestaande ID's, controleer verwijzingen tussen de bestanden en voer na wijzigingen `npm test` en `npm run build` uit.

Openbare missiegegevens komen uit [Missionfiles-All-Versions](https://github.com/Piet2001/Missionfiles-All-Versions); suggesties uit de issues van de webapp.

### Releases

Na een geslaagde releasepublicatie worden automatisch de nieuwste **10 Stable-releases en 10 Beta-releases** bewaard, op basis van het versienummer. Oudere releases, hun downloadbestanden en bijbehorende Git-tags worden verwijderd. Conceptreleases en releases met onbekende tagformaten worden niet opgeruimd.

- **Beta:** een push naar `dev` publiceert automatisch een prerelease.
- **Stable:** een push naar `main`, bijvoorbeeld na een merge, publiceert automatisch een release na een geslaagde test en build. Handmatig een tag van `main` publiceren in het formaat `vYYYY.MM.DD.HH.MM` blijft mogelijk.
- Stable-tags worden automatisch gegenereerd als `vYYYY.MM.DD.HH.MM`. Als een tag voor de huidige minuut al bestaat, wacht de versievoorbereiding tot de volgende minuut.
- Beta-tags gebruiken `vYYYY.MM.DD.HH.MM-beta`. Versietijden gebruiken `Europe/Amsterdam`, inclusief zomer- en wintertijd.
- De [installerworkflow](.github/workflows/windows-installer.yml) test en bouwt op Linux met Wine. Handmatig starten maakt een testartifact, geen release.
- [Dependabot](.github/dependabot.yml) stelt afhankelijkheidsupdates voor; deze worden niet automatisch samengevoegd.

### Kleine installers onderhouden

De kleine installers staan in [install](install); volledige installers staan in GitHub Releases. Elke kleine installer zoekt bij het starten de nieuwste release binnen zijn eigen kanaal. Een normale apprelease vereist daarom geen nieuwe kleine installer.

Na wijzigingen aan [Bootstrap.cs](install/Bootstrap.cs) of het logo bouw je op Windows beide installers opnieuw:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-bootstrap.ps1
```

Neem beide vernieuwde executables samen met de bronwijzigingen op in de repository. De [bootstrapworkflow](.github/workflows/bootstrap-installer.yml) bouwt en test, maar commit de executables niet automatisch.

De update-herstart-hook kun je na een installerbuild afzonderlijk testen:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-installer-restart.ps1
```

Deze test gebruikt een tijdelijke testapp en wijzigt geen bestaande installatie.
