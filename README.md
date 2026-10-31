# MKS Dashboard Desktop

Een desktop-app voor Windows die de belangrijkste overzichten van het [MKS Dashboard](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev) naar je pc brengt.

## Status

De eerste desktopbasis is in ontwikkeling. De app gebruikt Electron, React en TypeScript. De bestaande webapp is de functionele referentie; nog niet alle onderdelen daarvan zijn overgezet.

## Dashboardpagina's

- **Voertuigen:** aantallen per hulpdienst en voertuigtype, voertuiggroepen en extra waarden (zoals watercapaciteit), met zoekfunctie en gekleurde tabellen zoals in de webapp.
- **Gebouwen:** fysieke en technische aantallen per type, uitbreidingen met actief/inactief-status en specialisaties. Kleine gebouwen, niveaus en SAR-hangars worden volgens de telling van de webapp verwerkt.
- **Progressdata:** bezette en vrije ziekenhuisbedden, cellen en klaslokalen, apart voor eigen gebouwen en teamgebouwen. Nog niet beschikbare uitbreidingen tellen niet mee voor capaciteit.

Verder zijn er teamgebouwen, eigen/teamziekenhuizen en cellen met bezetting per locatie, gebouwspecialisaties met actief-status, accountgegevens, teamkas en een doorzoekbare/sorteerbare ledenlijst. Opleidingen en teamopleidingen tonen cursusgegevens voor zover de game-API deze beschikbaar stelt.

**Credits per spelversie** vergelijkt aantallen en gemiddelde opbrengsten van gewone, geplande en teammissies in alle 24 spelversies. **Suggesties** toont openstaande GitHub-issues van de webapp, met labels, de selectie voor de volgende webupdate en links om te reageren of een suggestie in te dienen.

**Missies**, **Geplande missies**, **Grote teammissies**, **Evenementen** en **Teamevents** tonen doorzoekbare missieoverzichten met filters, creditgrenzen, paginering en uitklapbare eisen. Evenementen zijn de seizoens-/feestdagmissies; geplande missies worden apart gefilterd op `guard_mission`. **POI's** geeft per POI-type de gekoppelde missieaantallen, niet de persoonlijke kaartlocaties. **Onderscheidingen** toont de medaillevoorwaarden; **Informatie** vat de missiegegevens samen. De sessie-invoer en versie-/updatestatus blijven in de desktopinterface; juridische en privacyteksten van de website zijn niet overgenomen.

Deze pagina's tonen geen raw JSON. Typenamen en rekenregels zijn gebaseerd op de `dev`-webapp; de gamecatalogus is lokaal meegeleverd en vereist geen MKS-proxy. Onbekende typen blijven zichtbaar met hun type-ID.

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
- Als je **Bewaar de SessionID versleuteld op deze pc** aanvinkt, slaat de app deze versleuteld op met de Windows-beveiliging. Je kunt de opgeslagen SessionID wissen met **Verwijder SessionID**.
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

Er zijn twee updatekanalen:

- **Stable:** publiceer een Git-tag in het formaat `vYYYY.MM.DD.HH.MM`, bijvoorbeeld `v2026.10.31.12.26`. De release en updates zijn gebaseerd op die tag van `main`.
- **Dev:** iedere push naar `dev` publiceert automatisch een nieuwe pre-release. Gebruik de Dev-installer om deze updates te ontvangen.

Dev-tags gebruiken `vYYYY.MM.DD.HH.MM-beta`, zonder runnummer; Stable-tags gebruiken `vYYYY.MM.DD.HH.MM`. Als de Dev-tag voor de huidige UTC-minuut al bestaat, wacht de build tot de volgende minuut. Intern gebruikt Electron een SemVer-versie met drie nummerdelen, bijvoorbeeld `2026.1031.1202-beta` voor Dev en `2026.1031.1202` voor Stable. De interface en GitHub-tags gebruiken de volledige datum.

Bij iedere updatecontrole kiest de app de hoogste gepubliceerde versie binnen het eigen kanaal. Dev gebruikt uitsluitend Dev-prereleases (`beta.yml`) en Stable uitsluitend Stable-releases (`latest.yml`); er is geen terugval naar het andere kanaal. Oudere versies worden niet als update geïnstalleerd. Deze selectie geldt zodra een installatie deze kanaalscheiding bevat.

Beide installers controleren bij het starten en daarna periodiek op updates voor hun eigen kanaal. Updates worden automatisch gedownload en bij het afsluiten geïnstalleerd; de app biedt ook een knop om direct opnieuw te starten en bij te werken. Updates vanuit de app worden zonder installatiewizard uitgevoerd; de herstartknop opent de app opnieuw na installatie. Alleen wanneer je de installer zelf start, verschijnt de installatiewizard. Windows kan bij benodigde beheerdersrechten nog om toestemming vragen. De installernaam bevat de UTC-tijd in het formaat `YYYY.MM.DD.HH.MM` en het kanaal. De interne appversie gebruikt een SemVer-compatibele, compacte datum/tijd-versie, zodat de Electron-updater versies goed kan vergelijken.

De Windows-installer wordt gebouwd op een gratis GitHub-hosted Linux-runner met Wine en een virtueel scherm. Je kunt de workflow ook handmatig starten via **Actions → Windows installer → Run workflow** op GitHub; dit maakt een testartifact maar publiceert geen release. Installatieartifacts blijven 14 dagen beschikbaar. Voor releases is geen code signing ingesteld; Windows kan daarom een waarschuwing tonen wanneer je een installer start.

## Huidige gegevensbronnen

De app haalt gegevens op via de officiële lees-API van Meldkamerspel, waaronder voertuigen, gebouwen, teamgebouwen, accountgegevens, teaminformatie, opleidingen, POI's en missiegegevens. Niet elk onderdeel van het webdashboard is al onderdeel van deze eerste desktopversie.

## Referentie

- [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev)
- [Officiële API-informatie van Meldkamerspel](https://www.meldkamerspel.com/api-infos)
