# MKS Dashboard Desktop

Een desktop-app voor Windows die de belangrijkste overzichten van het [MKS Dashboard](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev) naar je pc brengt.

## Status

De eerste desktopbasis is in ontwikkeling. De app gebruikt Electron, React en TypeScript. De bestaande webapp is de functionele referentie; nog niet alle onderdelen daarvan zijn overgezet.

## Privacy en verbinding

- De app en de API-aanroepen draaien op je eigen pc.
- Je voert zelf je Meldkamerspel-SessionID in, zoals in de bestaande webapp.
- De app voegt de SessionID toe aan de `_session_id`-queryparameter en vraagt de game-API rechtstreeks om gegevens. Je sessie wordt niet naar de MKS-proxy van de webapp gestuurd.
- De live gamegegevens vereisen een internetverbinding. Lokaal draaien is dus niet hetzelfde als volledig offline werken.
- Als je **Bewaar de SessionID versleuteld op deze pc** aanvinkt, slaat de app deze versleuteld op met de Windows-beveiliging. Je kunt de opgeslagen SessionID wissen met **Verwijder SessionID**.
- API-verzoeken zijn alleen-lezen en gaan naar de officiële game-API.

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
npm run build
npm run dist
```

`npm run dist` maakt een Windows-installatiebestand in de map `release`.

## Windows-installatie via GitHub Actions

De workflow in `.github/workflows/windows-installer.yml` bouwt de Windows-installer op een Linux-runner met Wine. De workflow start automatisch bij een push naar `main`, een pull request naar `main` of een tag die met `v` begint. Je kunt hem ook handmatig starten via **Actions → Windows installer → Run workflow** op GitHub.

Na een geslaagde run kun je de installer downloaden onder **Artifacts** bij de workflowrun. Het artifact blijft 14 dagen beschikbaar. Voor deze build is geen code signing ingesteld; Windows kan daarom een waarschuwing tonen wanneer je de installer start.

## Huidige gegevensbronnen

De app haalt gegevens op via de officiële lees-API van Meldkamerspel, waaronder voertuigen, gebouwen, teamgebouwen, accountgegevens, teaminformatie, opleidingen, POI's en missiegegevens. Niet elk onderdeel van het webdashboard is al onderdeel van deze eerste desktopversie.

## Referentie

- [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev)
- [Officiële API-informatie van Meldkamerspel](https://www.meldkamerspel.com/api-infos)
