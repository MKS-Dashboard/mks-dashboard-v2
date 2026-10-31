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

## Releases en automatische updates

Er zijn twee updatekanalen:

- **Stable:** publiceer een Git-tag in het formaat `vYYYY.MM.DD.HH.MM`, bijvoorbeeld `v2026.10.31.12.26`. De release en updates zijn gebaseerd op die tag van `main`.
- **Dev:** iedere push naar `dev` publiceert automatisch een nieuwe pre-release. Gebruik de Dev-installer om deze updates te ontvangen.

Beide installers controleren bij het starten en daarna periodiek op updates voor hun eigen kanaal. Updates worden automatisch gedownload en bij het afsluiten geïnstalleerd; de app biedt ook een knop om direct opnieuw te starten en bij te werken. De installernaam bevat de UTC-tijd in het formaat `YYYY.MM.DD.HH.MM` en het kanaal. De interne appversie gebruikt een SemVer-compatibele, compacte datum/tijd-versie, zodat de Electron-updater versies goed kan vergelijken.

De Windows-installer wordt gebouwd op een gratis GitHub-hosted Linux-runner met Wine en een virtueel scherm. Je kunt de workflow ook handmatig starten via **Actions → Windows installer → Run workflow** op GitHub; dit maakt een testartifact maar publiceert geen release. Installatieartifacts blijven 14 dagen beschikbaar. Voor releases is geen code signing ingesteld; Windows kan daarom een waarschuwing tonen wanneer je een installer start.

## Huidige gegevensbronnen

De app haalt gegevens op via de officiële lees-API van Meldkamerspel, waaronder voertuigen, gebouwen, teamgebouwen, accountgegevens, teaminformatie, opleidingen, POI's en missiegegevens. Niet elk onderdeel van het webdashboard is al onderdeel van deze eerste desktopversie.

## Referentie

- [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev)
- [Officiële API-informatie van Meldkamerspel](https://www.meldkamerspel.com/api-infos)
