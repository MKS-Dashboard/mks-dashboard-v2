# Ontwikkeling en onderhoud

Deze handleiding bevat technische informatie voor ontwikkelaars en beheerders. Voor installatie en dagelijks gebruik, zie de [README](README.md).

## Lokaal ontwikkelen

De app gebruikt Electron, React en TypeScript en is gebaseerd op [MKS Dashboard voor het web](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/dev). Voor ontwikkeling heb je Node.js 24 met npm nodig.

Voer in de repository uit:

```powershell
npm.cmd ci
npm.cmd run dev
```

Stop de dev-app met **Ctrl+C** in de terminal. Start daarna opnieuw met `npm.cmd run dev`. Herstart na wijzigingen aan het main-proces om zeker te zijn dat de nieuwe code wordt gebruikt.

### Problemen met npm op Windows

Als PowerShell meldt dat `npm.ps1` niet mag worden uitgevoerd, gebruik dan `npm.cmd` zoals hierboven. Hiervoor hoef je het PowerShell-uitvoeringsbeleid niet te wijzigen.

Bij de melding **Electron uninstall** kan de Electron-binary ontbreken. Herstel de installatie met:

```powershell
npm.cmd rebuild electron
npm.cmd run dev
```

## Tests en builds

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dist -- --publish never
```

De installer verschijnt in [release](release). `npm.cmd run dist` voert ook de typecontrole en appbuild uit. Gebruik voor gerichte tests de bestaande Node-testrunner, bijvoorbeeld:

```powershell
node --test scripts\desktop-pages.test.mjs
```

## Gegevens en authenticatie

Gameverzoeken worden in het Electron-main-proces lokaal uitgevoerd en zijn alleen-lezen. De app gebruikt geen MKS-proxy.

- De account-endpoints staan in [src/shared/contracts.ts](src/shared/contracts.ts); verzoeken worden uitgevoerd in [src/main/index.ts](src/main/index.ts).
- Accountgebonden verzoeken sturen de SessionID via de `Cookie`-header als `_session_id`. De SessionID staat niet in de URL. Bij een fout wordt niet teruggevallen op een URL-parameter.
- Openbare gameverzoeken en verzoeken naar GitHub bevatten geen SessionID.
- Redirects worden niet automatisch gevolgd, zodat authenticatie niet met een redirect wordt doorgestuurd.
- Een SessionID moet een geldige cookie-waarde zijn. Ongeldige invoer wordt geweigerd voordat deze wordt opgeslagen of verstuurd.
- Optioneel wordt de SessionID versleuteld opgeslagen via Electron `safeStorage`, met de Windows-beveiliging. Stable en Beta hebben afzonderlijke instellingen en opgeslagen sessies.

De app is afhankelijk van de beschikbaarheid en voorwaarden van de [Meldkamerspel-API](https://www.meldkamerspel.com/api-infos). Deel geen SessionID in logs, tests, screenshots of issues.

## Probleemonderzoek

### Errorrapport

Via **Instellingen > Genereer error rapport** wordt een momentopname gemaakt van foutstatussen en de laatst opgehaalde gegevens. Het rapport vermeldt onbekende voertuigtypen, gebouwtypen en specialisaties, verwerkingsfouten, mislukte gegevensverzoeken, updatefouten en overige waargenomen appfouten. Die laatste kunnen inmiddels zijn opgelost.

Dit werkt in Stable en Beta en doet geen extra API-verzoeken. Nog niet opgehaalde bronnen kunnen niet worden beoordeeld. Volledige responses worden niet opgenomen en SessionID-parameters in foutmeldingen worden afgeschermd. Controleer het rapport op overige gevoelige informatie voordat je het deelt. Waargenomen fouten worden alleen in het geheugen bewaard en bij uitloggen gewist.

### Raw API-responses

Beta gebruikt intern het **Dev**-kanaal. Via **Instellingen > Dev mode** wordt de pagina **Raw API-responses** beschikbaar. Deze optie staat standaard uit en is niet beschikbaar in Stable.

De pagina toont de laatst opgehaalde responses zonder extra verzoeken of opslag op schijf. Verzoek-URL's bevatten geen SessionID; de authenticatieheader wordt niet getoond. Responses kunnen wel account- en teamgegevens bevatten: controleer de inhoud voordat je deze deelt.

### Automatisch vernieuwen

Het standaardinterval voor gamegegevens is vijf minuten. Automatisch ophalen gebeurt alleen met een actieve sessie; handmatig ophalen begint het interval opnieuw. Bij uitschakelen blijft het ingestelde interval bewaard. Dit mechanisme staat los van de controle op app-updates.

## Gamecatalogus

De vaste JSON-catalogi blijven in [src/renderer/src/data](src/renderer/src/data), per gegevenssoort opgesplitst. Rekenregels blijven in de app. Cataloguswijzigingen worden via een nieuwe appversie verspreid.

De uitgangsgegevens komen uit de [webapp op commit 8ec5374](https://github.com/MKS-Dashboard/mks-dashboard.github.io/tree/8ec537480f00a71c583c8fc3513426d2cacde021/src/Lists). Behoud bestaande ID's, controleer verwijzingen tussen de bestanden en voer na wijzigingen `npm.cmd test` en `npm.cmd run build` uit.

Openbare missiegegevens komen uit [Missionfiles-All-Versions](https://github.com/Piet2001/Missionfiles-All-Versions); suggesties uit de issues van de webapp.

## Releases

Na een geslaagde releasepublicatie worden automatisch de nieuwste **10 Stable-releases en 10 Beta-releases** bewaard, op basis van het versienummer. Oudere releases, hun downloadbestanden en bijbehorende Git-tags worden verwijderd. Conceptreleases en releases met onbekende tagformaten worden niet opgeruimd.

- **Beta:** een push naar `dev` publiceert automatisch een prerelease.
- **Stable:** een push naar `main`, bijvoorbeeld na een merge, publiceert automatisch een release na een geslaagde test en build. Handmatig een tag van `main` publiceren in het formaat `vYYYY.MM.DD.HH.MM` blijft mogelijk.
- Stable-tags worden automatisch gegenereerd als `vYYYY.MM.DD.HH.MM`. Als een tag voor de huidige minuut al bestaat, wacht de versievoorbereiding tot de volgende minuut.
- Beta-tags gebruiken `vYYYY.MM.DD.HH.MM-beta`. Versietijden gebruiken `Europe/Amsterdam`, inclusief zomer- en wintertijd.
- De [installerworkflow](.github/workflows/windows-installer.yml) test en bouwt op Linux met Wine. Handmatig starten maakt een testartifact, geen release.
- [Dependabot](.github/dependabot.yml) stelt afhankelijkheidsupdates voor; deze worden niet automatisch samengevoegd.

De app controleert bij het starten en vervolgens iedere vier uur op updates. Stable ontvangt uitsluitend Stable-updates; Beta uitsluitend Beta-updates. Downloaden en installeren gebeurt pas na een expliciete gebruikersactie, niet bij normaal afsluiten.

## Kleine installers onderhouden

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
