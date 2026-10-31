# MKS Dashboard Desktop

Een desktop-app voor Windows die de belangrijkste overzichten van het [MKS Dashboard](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev) naar je pc brengt.

## Status

De eerste desktopbasis is in ontwikkeling. De app gebruikt Electron, React en TypeScript. De bestaande webapp is de functionele referentie; nog niet alle onderdelen daarvan zijn overgezet.

## Dashboardpagina's

De openbare pagina's (missies, geplande/grote teammissies, evenementen, teamevents, POI's, onderscheidingen, informatie, creditvergelijking en suggesties) zijn standaard verborgen. Alleen in **Dev** kun je ze zichtbaar maken via **Instellingen > Infoblocks**. Deze keuze wordt lokaal onthouden; Stable toont deze pagina's nooit, ook niet als de optie eerder in Dev is ingeschakeld.

Ook de instellingen voor Infoblocks en Dev mode zelf zijn volledig verborgen in Stable.

Het rode MKS-appicoon staat in `build/icon.png` en wordt gebruikt voor het appvenster, de Windows-app en de installer.

**Automatisch vernieuwen** staat standaard aan en kan in Instellingen worden uitgeschakeld. Ook deze keuze wordt lokaal onthouden; handmatig ophalen blijft altijd mogelijk.

**Spelersmenu > Instellingen > Gegevens vernieuwen (minuten)** bepaalt hoe vaak dashboardgegevens automatisch worden opgehaald. Standaard is dit **5 minuten**; vul een geheel getal van minimaal 1 in en klik op **Opslaan**. De keuze wordt lokaal onthouden en is beschikbaar in Dev en Stable, ook zonder aanmelding. Automatisch ophalen gebeurt alleen na succesvolle aanmelding, stopt bij uitloggen of een mislukte sessiecontrole en overlapt niet met lopende requests. Handmatig ophalen begint het interval opnieuw. Dit is geen interval voor app-updates.

Accountafhankelijke pagina's en overzichtskaarten zijn verborgen totdat de sessie succesvol gamegegevens heeft opgehaald, en verdwijnen weer bij uitloggen of een mislukte sessiecontrole. Het zijmenu groepeert gebouwen (inclusief eigen opleidingen), teamgegevens (inclusief teamopleidingen) en openbare informatie in inklapbare groepen, zoals de webapp. Overzicht en Instellingen blijven bereikbaar zonder aanmelding; de Dev-opties blijven onafhankelijk van de accountkoppeling.

- **Voertuigen:** aantallen per hulpdienst en voertuigtype, voertuiggroepen en extra waarden (zoals watercapaciteit), met zoekfunctie en gekleurde tabellen zoals in de webapp.
- **Gebouwen:** fysieke en technische aantallen per type, uitbreidingen met actief/inactief-status en specialisaties. Kleine gebouwen, niveaus en SAR-hangars worden volgens de telling van de webapp verwerkt.
- **Progressdata:** bezette en vrije ziekenhuisbedden, cellen en klaslokalen, apart voor eigen gebouwen en teamgebouwen. Nog niet beschikbare uitbreidingen tellen niet mee voor capaciteit.

Verder zijn er teamgebouwen, eigen/teamziekenhuizen en cellen met bezetting per locatie, gebouwspecialisaties met actief-status, accountgegevens, teamkas en een doorzoekbare/sorteerbare ledenlijst. Opleidingen en teamopleidingen tonen cursusgegevens voor zover de game-API deze beschikbaar stelt.

**Credits per spelversie** vergelijkt aantallen en gemiddelde opbrengsten van gewone, geplande en teammissies in alle 24 spelversies. **Suggesties** toont openstaande GitHub-issues van de webapp, met labels, de selectie voor de volgende webupdate en links om te reageren of een suggestie in te dienen.

**Missies**, **Geplande missies**, **Grote teammissies**, **Evenementen** en **Teamevents** tonen doorzoekbare missieoverzichten met filters, creditgrenzen, paginering en uitklapbare eisen. Evenementen zijn de seizoens-/feestdagmissies; geplande missies worden apart gefilterd op `guard_mission`. **POI's** geeft per POI-type de gekoppelde missieaantallen, niet de persoonlijke kaartlocaties. **Onderscheidingen** toont de medaillevoorwaarden; **Informatie** vat de missiegegevens samen. De sessie-invoer en versie-/updatestatus blijven in de desktopinterface; juridische en privacyteksten van de website zijn niet overgenomen.

Deze pagina's tonen geen raw JSON. Typenamen en rekenregels zijn gebaseerd op de `dev`-webapp; de gamecatalogus is lokaal meegeleverd en vereist geen MKS-proxy. Onbekende typen blijven zichtbaar met hun type-ID.

Voor troubleshooting kun je in **Dev > Instellingen > Dev mode** de pagina **Raw API-responses** inschakelen. Kies daar een dashboardgegevensbron om de volledige laatst opgehaalde JSON-response en de gebruikte GET-URL te bekijken; bij mislukte requests zie je de foutmelding. De SessionID in de URL is afgeschermd. Responses kunnen account- en teamgegevens bevatten: deel ze niet zomaar. Er worden geen extra requests gedaan en responses worden niet op schijf opgeslagen. De optie staat standaard uit, wordt lokaal onthouden en is nooit beschikbaar in Stable. Dev mode werkt onafhankelijk van Infoblocks; de normale overzichten blijven behouden.

### Gamecatalogus onderhouden

De vaste gegevens staan per gegevenssoort in `src/renderer/src/data`:

- `vehicles.json`: voertuig-ID's, afkortingen, omschrijvingen en hulpdiensten.
- `vehicle-groups.json`: voertuiggroepen met verwijzingen naar voertuig-ID's.
- `vehicle-values.json`: extra waarden per voertuigtype, zoals watercapaciteit.
- `buildings.json`: gebouwtypen en regels voor kleine gebouwen, niveaus en uitbreidingen.
- `specializations.json`: namen van gebouwspecialisaties.
- `schools.json`: schooltypen met hun gebouw-ID's.
- `awards.json`: onderscheidingen en medailledrempels.
- `poi.json`: POI-typen.
- `events.json`: seizoens-/feestdagevenementen met missie-ID's.
- `event-categories.json`: categorieen voor evenementen.
- `mission-translations.json`: vertalingen van missie-eisen en aanvullende velden.
- `mission-exclusions.json`: uitzonderingen voor het indelen van missies.

De uitgangsgegevens komen uit de [webapp op commit 8ec5374](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/8ec537480f00a71c583c8fc3513426d2cacde021/src/Lists). Bewaar bestaande ID's en controleer verwijzingen tussen de bestanden wanneer je typen toevoegt of wijzigt. Voer daarna `npm test` en `npm run build` uit. De bestanden worden met de app meegebouwd; gewijzigde catalogusgegevens komen bij gebruikers terecht via een nieuwe appversie.

## Privacy en verbinding

- De app en de API-aanroepen draaien op je eigen pc.
- Je voert zelf je Meldkamerspel-SessionID in, zoals in de bestaande webapp.
- De app voegt de SessionID toe aan de `_session_id`-queryparameter en vraagt de game-API rechtstreeks om gegevens. Je sessie wordt niet naar de MKS-proxy van de webapp gestuurd.
- De live gamegegevens vereisen een internetverbinding. Lokaal draaien is dus niet hetzelfde als volledig offline werken.
- Als je **Bewaar de SessionID versleuteld op deze pc** aanvinkt, slaat de app deze versleuteld op met de Windows-beveiliging. Via **Gebruikersmenu > Uitloggen** wis je de sessie en de opgehaalde gegevens uit de app en keer je terug naar het aanmeldscherm. Gebruik dit ook om een andere SessionID in te voeren.
- **Gegevens ophalen** en **Updates controleren** staan rechtsboven onder **Gebruikersmenu**. Zodra een update klaarstaat, blijft **Herstarten en bijwerken** direct zichtbaar.
- De menuknop toont de spelersnaam uit de accountgegevens. **Details** in dit menu opent **Accountgegevens**; deze pagina staat niet meer in het zijmenu of tussen de overzichtskaarten. **Instellingen** staat ook in dit menu en blijft zonder actieve sessie beschikbaar. Zonder actieve sessie staat er **Niet aangemeld**; als de naam niet kan worden opgehaald, staat er **Naam niet beschikbaar**.
- **Accountgegevens** toont ook **Plek op ranglijst** (`user_toplist_position`) en **Rang** (`user_level_title`) uit `/api/userinfo`.
- Eigen en teamopleidingen lezen de `result`-lijst uit de API en tonen onder meer de opleidingsnaam (`education_title`), vrije plaatsen, gestart-status en einddatum (`finish_time`). Het menu telt dezelfde opleidingen als de pagina.
- Getallen worden Nederlands opgemaakt met een punt als duizendscheidingsteken (bijvoorbeeld `27.063`) en een komma voor decimalen. Raw API-responses blijven ongewijzigd.
- Bij het opstarten probeert de app automatisch de opgeslagen SessionID en haalt daarmee je gegevens op. Het invoerveld verschijnt pas als er geen opgeslagen SessionID is of het ophalen mislukt. Geldige lege lijsten tellen ook als een geslaagde sessie; bij een verbindingsfout blijft de opgeslagen SessionID behouden zodat je opnieuw kunt proberen.
- API-verzoeken zijn alleen-lezen en gaan naar de officiële game-API.
- Openbare missiegegevens en de creditvergelijking worden rechtstreeks vanaf deze pc opgehaald uit `Piet2001/Missionfiles-All-Versions` op GitHub. Suggesties worden opgehaald uit de issues van de webapp. Deze openbare verzoeken bevatten nooit je SessionID. Links openen alleen toegestane GitHub- en Meldkamerspel-pagina's in je browser.

De API is afhankelijk van de beschikbaarheid en voorwaarden van Meldkamerspel en kan veranderen. Behandel je SessionID als een wachtwoord en deel deze nooit met anderen.

## Benodigdheden

- Windows 10 of nieuwer
- [Node.js LTS](https://nodejs.org/) met npm

## Ontwikkelen

```powershell
npm install
npm run dev
```

## Controleren en bouwen

```powershell
npm run typecheck
npm test
npm run build
npm run dist
```

`npm run dist` maakt een Windows-installatiebestand in de map `release`.

## Releases en automatische updates

### Afhankelijkheden bijwerken

Dependabot controleert npm-afhankelijkheden en GitHub Actions iedere maandag rond 09:00 (Europe/Amsterdam). Versie-update-PR's richten zich op `dev`, met maximaal vijf open PR's per ecosysteem. Er is geen automatisch samenvoegen ingesteld. De bestaande PR-workflow voert tests, typecontrole en een installerbuild uit; na samenvoegen in `dev` verschijnt een Dev-release. Breng geteste wijzigingen daarna naar `main` voor Stable.

De configuratie staat in [.github/dependabot.yml](.github/dependabot.yml) en moet ook op de standaardbranch `main` staan voordat GitHub deze activeert. Schakel daarnaast **Dependabot alerts** en **Dependabot security updates** in onder **Settings > Advanced Security** (of **Code security**). Beveiligingsupdates richten zich op de standaardbranch, niet op de ingestelde `target-branch` voor gewone versie-updates; breng zulke fixes ook naar `dev`.

### Appreleases

Er zijn twee updatekanalen:

- **Stable:** publiceer een Git-tag in het formaat `vYYYY.MM.DD.HH.MM`, bijvoorbeeld `v2026.10.31.12.26`. De release en updates zijn gebaseerd op die tag van `main`.
- **Dev:** iedere push naar `dev` publiceert automatisch een nieuwe pre-release. Gebruik de Dev-installer om deze updates te ontvangen.

Dev-tags gebruiken `vYYYY.MM.DD.HH.MM-beta`, zonder runnummer; Stable-tags gebruiken `vYYYY.MM.DD.HH.MM`. Als de Dev-tag voor de huidige UTC-minuut al bestaat, wacht de build tot de volgende minuut. Intern gebruikt Electron een SemVer-versie met drie nummerdelen, bijvoorbeeld `2026.1031.1202-beta` voor Dev en `2026.1031.1202` voor Stable. De interface en GitHub-tags gebruiken de volledige datum.

Bij iedere updatecontrole kiest de app de hoogste gepubliceerde versie binnen het eigen kanaal. Dev gebruikt uitsluitend Dev-prereleases (`beta.yml`) en Stable uitsluitend Stable-releases (`latest.yml`); er is geen terugval naar het andere kanaal. Oudere versies worden niet als update geïnstalleerd. Deze selectie geldt zodra een installatie deze kanaalscheiding bevat.

Beide installers controleren bij het starten en daarna periodiek op updates voor hun eigen kanaal. **Updates controleren** zoekt alleen naar een nieuwe versie: er wordt niets automatisch gedownload of bij afsluiten geïnstalleerd. Klik zelf op **Bijwerken** om te beginnen. Eerst toont de app een MKS-downloadscherm met voortgang; daarna neemt de installer het over met een installatievoortgangsbalk, zonder installatiekeuzes of bevestiging achteraf. De app opent automatisch na installatie. De balken tonen download- en installatievoortgang, niet de daaropvolgende opstarttijd. Een al gedownloade update kan met **Herstarten en bijwerken** worden geïnstalleerd. Alleen wanneer je de installer zelf start, verschijnt de volledige installatiewizard. Windows kan bij benodigde beheerdersrechten nog om toestemming vragen. De installernaam bevat de UTC-tijd in het formaat `YYYY.MM.DD.HH.MM` en het kanaal. De interne appversie gebruikt een SemVer-compatibele, compacte datum/tijd-versie, zodat de Electron-updater versies goed kan vergelijken.

De Windows-installer wordt gebouwd op een gratis GitHub-hosted Linux-runner met Wine en een virtueel scherm. Je kunt de workflow ook handmatig starten via **Actions → Windows installer → Run workflow** op GitHub; dit maakt een testartifact maar publiceert geen release. Installatieartifacts blijven 14 dagen beschikbaar. Voor releases is geen code signing ingesteld; Windows kan daarom een waarschuwing tonen wanneer je een installer start.

## Huidige gegevensbronnen

De app haalt gegevens op via de officiële lees-API van Meldkamerspel, waaronder voertuigen, gebouwen, teamgebouwen, accountgegevens, teaminformatie, opleidingen, POI's en missiegegevens. Niet elk onderdeel van het webdashboard is al onderdeel van deze eerste desktopversie.

## Referentie

- [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev)
- [Officiële API-informatie van Meldkamerspel](https://www.meldkamerspel.com/api-infos)
