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

**Over de app > Het project in cijfers** toont een telling die de Vite-configuratie bij elke start/build berekent. [project-stats.ts](scripts/project-stats.ts) telt broncodebestanden in `src`, `scripts`, `install`, `build` en broncode/configuratie in de repositoryroot. Alleen TS, TSX, JS, JSX, MJS, CJS, CSS, HTML, C#, PowerShell en NSIS worden geteld. Niet-lege regels inclusief commentaar tellen mee; JSON, documentatie, dependencies en buildoutputs niet. De telling wordt in de rendererbundle opgenomen en vereist geen bronbestanden op de pc van de eindgebruiker.

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

Equipment wordt als accountgegevens opgehaald via `/api/equipments`, met dezelfde cookie-authenticatie als voertuigen. De pagina gebruikt `equipment_type` voor catalogusnamen; `vehicle_id` en `assigned_vehicle_id` worden afzonderlijk getoond. Onbekende typen blijven zichtbaar en worden in het errorrapport vermeld. Equipmentnamen staan in [equipments.json](src/renderer/src/data/equipments.json); gebouwen en voertuigen worden gekoppeld aan de al opgehaalde accountgegevens.

Gameverzoeken worden in het Electron-main-proces lokaal uitgevoerd en zijn alleen-lezen. De app gebruikt geen MKS-proxy.

- De account-endpoints staan in [src/shared/contracts.ts](src/shared/contracts.ts); verzoeken worden uitgevoerd in [src/main/index.ts](src/main/index.ts).
- Accountgebonden verzoeken sturen de SessionID via de `Cookie`-header als `_session_id`. De SessionID staat niet in de URL. Bij een fout wordt niet teruggevallen op een URL-parameter.
- Openbare gameverzoeken en verzoeken naar GitHub bevatten geen SessionID.
- Redirects worden niet automatisch gevolgd, zodat authenticatie niet met een redirect wordt doorgestuurd.
- Een SessionID moet een geldige cookie-waarde zijn. Ongeldige invoer wordt geweigerd voordat deze wordt opgeslagen of verstuurd.
- Optioneel wordt de SessionID versleuteld opgeslagen via Electron `safeStorage`, met de Windows-beveiliging. Stable en Beta hebben afzonderlijke instellingen en opgeslagen sessies.

De app is afhankelijk van de beschikbaarheid en voorwaarden van de [Meldkamerspel-API](https://www.meldkamerspel.com/api-infos). Deel geen SessionID in logs, tests, screenshots of issues.

## Probleemonderzoek

### Gebruiksregistratie

Na het ophalen van geldige accountgegevens uit `/api/userinfo` registreert het main-proces gebruik via `POST https://piet2001-mks.hf.space/users/log`. De payload is `{ "userid": 12345, "username": "ExampleUser", "versie": "2026.11.01.15.40", "beta": true }`. De identiteit komt uit `user_id` en `user_name`; `versie` is de weergegeven appversie. `beta` is `true` voor Beta en lokale ontwikkeling, en `false` voor Stable, zodat de backend de juiste tabel kan kiezen. De registratie ontvangt geen SessionID, cookies of overige spelgegevens; redirects worden niet gevolgd. Een versie-update wijzigt de bestaande daglimiet niet.

Een HTTP 2xx-respons geldt als succes. De backend bepaalt `firstUse` en `lastUse`. Na succes wordt per userid de kalenderdag in `Europe/Amsterdam` bewaard in `user-usage-days.json` in de appgegevensmap; namen worden lokaal niet in dit bestand opgeslagen. Herstarten, uitloggen en opnieuw aanmelden wissen de daglimiet niet. Gelijktijdige registraties in hetzelfde main-proces worden achter elkaar uitgevoerd. Na een netwerk- of HTTP-fout kan de volgende gegevensverversing opnieuw proberen. Registratiefouten worden afzonderlijk getoond en blokkeren het dashboard niet.

Deze limiet geldt per installatie, niet wereldwijd: Stable en Beta, meerdere pc's of verwijderde appgegevens kunnen extra registraties veroorzaken. De backend moet zelf per userid en dag dedupliceren en rate limiting toepassen. De client kan geen accountbezit bewijzen. Bij een opslagfout na een succesvolle POST blijft de dag in het geheugen gemarkeerd, maar kan na herstart een extra registratie optreden.

De app informeert gebruikers op het aanmeldscherm, via **Gebruikersmenu > Over de app** en in de README over automatische registratie. De melding **De app verzamelt gebruiksgegevens** heeft uitklapbare **Meer details**. Dit is informatie, geen toestemmingsmechanisme of vastgestelde rechtsgrond. Leg ook de rechtsgrond, bewaartermijn, toegangsbeveiliging en afhandeling van verwijderingsverzoeken vast.

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

### Dagelijks voorstel voor gebouwgegevens

De automatische planning van de [gebouwcatalogusworkflow](.github/workflows/update-buildings.yml) is tijdelijk uitgeschakeld. De workflow vergelijkt bij handmatig starten de catalogus op `dev` met de [Nederlandse gebouwgegevens van lss-information](https://github.com/lss-information/lss-information.github.io/blob/main/gameversions/nl_NL/nl_NL-Data/buildings.json). Een in GitHub uitgeschakelde workflow moet eerst weer worden ingeschakeld voordat handmatig starten mogelijk is.

Bij verschillen opent of vernieuwt de workflow één PR vanaf `automation/update-buildings` naar `dev`. Alleen namen en ontbrekende gebouw-ID's worden bijgewerkt. Bestaande telregels en verwijzingen blijven behouden; gebouwen worden nooit verwijderd. Nieuwe typen tellen standaard alleen fysieke gebouwen. Controleer hun telregels en eventuele kleine varianten voordat je de PR samenvoegt. De namen in de bron worden letterlijk overgenomen, dus ook bestaande naamverschillen worden voorgesteld.

Ongeldige brongegevens laten de workflow expliciet mislukken. Bij wijzigingen worden tests en de typecontrole uitgevoerd. Er wordt niet automatisch samengevoegd. Gebruikers krijgen de bijgewerkte catalogus bij een volgende apprelease.

Voor de dagelijkse planning moet deze workflow op de **default branch** van GitHub staan; alleen toevoegen aan `dev` activeert de planning niet als `main` de default branch is. Schakel onder **Settings > Actions > General > Workflow permissions** ook **Allow GitHub Actions to create and approve pull requests** in. De workflow gebruikt `GITHUB_TOKEN`: hierdoor starten andere workflows op de automatisch gemaakte PR niet vanzelf. De updateworkflow voert daarom zelf tests en typecontrole uit; voor aanvullende PR-checks is eventueel een apart GitHub App-token nodig.

Lokaal vergelijken zonder bestanden te wijzigen:

```powershell
node scripts\update-buildings.mjs --dry-run
```

Zonder `--dry-run` schrijft het script voorgestelde wijzigingen naar de lokale gebouwcatalogus.

### Voertuigen en equipment

De automatische planning van de [aanvullende catalogusworkflow](.github/workflows/update-extra-catalogs.yml) is eveneens tijdelijk uitgeschakeld. Bij handmatig starten maakt deze aparte PR's naar `dev` voor `vehicles` en `equipments`, vanaf `automation/update-vehicles` en `automation/update-equipments`. Dezelfde GitHub Actions-permissies als voor gebouwen gelden. Om de dagelijkse planning te herstellen, voeg je aan beide workflows weer `schedule` met cron `0 6 * * *` toe op de default branch en schakel je ze zo nodig weer in op GitHub.

Bronnen zijn [Vehicles.json](https://raw.githubusercontent.com/lss-information/lss-information.github.io/refs/heads/main/gameversions/nl_NL/nl_NL-Data/Vehicles.json) en [equipments.json](https://raw.githubusercontent.com/lss-information/lss-information.github.io/refs/heads/main/gameversions/nl_NL/nl_NL-Data/equipments.json). Alleen ontbrekende ID's en gewijzigde namen worden voorgesteld; bestaande records worden niet verwijderd. Voertuigomschrijvingen en categorieën blijven behouden. Nieuwe voertuigen krijgen lege omschrijvingen en categorieën, die je vóór samenvoegen handmatig beoordeelt en aanvult.

Lege voertuigomschrijvingen worden daarna aangevuld uit het [kostenoverzicht van MeldkamerspelGameTeam](https://github.com/MeldkamerspelGameTeam/Blog/blob/main/Kostenoverzichtv2/Scripts/Data/voertuigen.json), uitsluitend wanneer de bijgewerkte voertuignaam exact overeenkomt met `afkorting`. Bestaande niet-lege omschrijvingen blijven behouden. Er wordt niet op vergelijkbare namen gekoppeld; equipmentrecords uit deze bron worden niet als voertuigen toegevoegd. Als een van de bronnen ongeldig of onbereikbaar is, wordt geen gedeeltelijke catalogusupdate geschreven.

De [equipmentcatalogus](src/renderer/src/data/equipments.json) bevat alleen ID's en namen voor de equipmentpagina. De update-PR stelt ontbrekende bron-ID's en gewijzigde namen voor; overige bronvelden worden niet geïmporteerd.

Lokaal controleren zonder wijzigingen:

```powershell
node scripts\update-extra-catalogs.mjs vehicles --dry-run
node scripts\update-extra-catalogs.mjs equipments --dry-run
```

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
