# Bestanden

Automatisch gegenereerd uit de repositorybestanden op dev.
🟢 Telt mee in de broncodetelling · 🔴 Telt niet mee.
Genegeerde en lokale buildbestanden staan niet in dit overzicht.

## Broncodetelling

**11.462 niet-lege regels** in 61 bestanden, inclusief commentaar.

| Extensie | Bestanden | Niet-lege regels |
| --- | ---: | ---: |
| `.cjs` | 1 | 45 |
| `.cs` | 2 | 224 |
| `.css` | 1 | 1.377 |
| `.html` | 1 | 16 |
| `.json` | 13 | 4.403 |
| `.mjs` | 16 | 2.039 |
| `.nsh` | 1 | 73 |
| `.ps1` | 2 | 125 |
| `.ts` | 16 | 1.241 |
| `.tsx` | 8 | 1.919 |

## Bestandsboom

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── 🔴 bug_report.yml
│   │   └── 🔴 feature_request.yml
│   ├── workflows/
│   │   ├── 🔴 bootstrap-installer.yml
│   │   ├── 🔴 generate-files.yml
│   │   ├── 🔴 next-release.yml
│   │   ├── 🔴 update-buildings.yml
│   │   ├── 🔴 update-extra-catalogs.yml
│   │   └── 🔴 windows-installer.yml
│   └── 🔴 dependabot.yml
├── build/
│   ├── 🔴 icon.png
│   └── 🟢 installer.nsh
├── install/
│   ├── 🟢 Bootstrap.cs
│   ├── 🔴 MKS-Dashboard-Setup-Beta.exe
│   └── 🔴 MKS-Dashboard-Setup-Stable.exe
├── scripts/
│   ├── 🟢 bootstrap.test.cs
│   ├── 🟢 build-bootstrap.ps1
│   ├── 🟢 cleanup-releases.mjs
│   ├── 🟢 cleanup-releases.test.mjs
│   ├── 🟢 dashboard-model.test.mjs
│   ├── 🟢 desktop-pages.test.mjs
│   ├── 🟢 generate-files.mjs
│   ├── 🟢 generate-files.test.mjs
│   ├── 🟢 information-pages.test.mjs
│   ├── 🟢 label-next-release.mjs
│   ├── 🟢 label-next-release.test.mjs
│   ├── 🟢 prepare-release.mjs
│   ├── 🟢 prepare-release.test.mjs
│   ├── 🟢 project-stats.ts
│   ├── 🟢 test-installer-restart.ps1
│   ├── 🟢 update-buildings.mjs
│   ├── 🟢 update-buildings.test.mjs
│   ├── 🟢 update-extra-catalogs.mjs
│   ├── 🟢 update-extra-catalogs.test.mjs
│   └── 🟢 update-feed.test.mjs
├── src/
│   ├── main/
│   │   ├── 🟢 index.ts
│   │   ├── 🟢 reference-data.ts
│   │   ├── 🟢 update-feed.ts
│   │   └── 🟢 user-usage.ts
│   ├── preload/
│   │   └── 🟢 index.ts
│   ├── renderer/
│   │   ├── src/
│   │   │   ├── data/
│   │   │   │   ├── 🟢 awards.json
│   │   │   │   ├── 🟢 buildings.json
│   │   │   │   ├── 🟢 equipments.json
│   │   │   │   ├── 🟢 event-categories.json
│   │   │   │   ├── 🟢 events.json
│   │   │   │   ├── 🟢 information-model.ts
│   │   │   │   ├── 🟢 mission-exclusions.json
│   │   │   │   ├── 🟢 mission-translations.json
│   │   │   │   ├── 🟢 poi.json
│   │   │   │   ├── 🟢 schools.json
│   │   │   │   ├── 🟢 specializations.json
│   │   │   │   ├── 🟢 vehicle-groups.json
│   │   │   │   ├── 🟢 vehicle-values.json
│   │   │   │   └── 🟢 vehicles.json
│   │   │   ├── 🟢 AccountPages.tsx
│   │   │   ├── 🟢 App.tsx
│   │   │   ├── 🟢 DashboardPages.tsx
│   │   │   ├── 🟢 EquipmentsPage.tsx
│   │   │   ├── 🟢 ErrorReportPanel.tsx
│   │   │   ├── 🟢 InformationPages.tsx
│   │   │   ├── 🟢 RawResponsesPage.tsx
│   │   │   ├── 🟢 dashboard-model.ts
│   │   │   ├── 🟢 error-report.ts
│   │   │   ├── 🟢 infoblocks.ts
│   │   │   ├── 🟢 main.tsx
│   │   │   ├── 🟢 navigation.ts
│   │   │   ├── 🟢 refresh-interval.ts
│   │   │   ├── 🟢 schoolings.ts
│   │   │   ├── 🟢 styles.css
│   │   │   └── 🟢 vite-env.d.ts
│   │   └── 🟢 index.html
│   └── shared/
│       └── 🟢 contracts.ts
├── 🔴 .gitignore
├── 🔴 README.md
├── 🔴 dev.md
├── 🟢 electron-builder.config.cjs
├── 🟢 electron.vite.config.ts
├── 🔴 files.md
├── 🔴 package-lock.json
├── 🔴 package.json
├── 🔴 tsconfig.base.json
├── 🔴 tsconfig.json
├── 🔴 tsconfig.node.json
└── 🔴 tsconfig.web.json
```

## Niet meegetelde bestanden

**6.898 niet-lege regels** in 22 bestanden.
3 binaire of niet-tekstbestanden tellen mee als bestand, maar niet voor de regels. Symbolische koppelingen worden ook als niet-tekst behandeld.
De tekstregels omvatten ook dit overzicht en tellen niet mee in de broncodetelling.

| Extensie | Bestanden | Niet-lege regels | Niet-tekstbestanden |
| --- | ---: | ---: | ---: |
| `(zonder extensie)` | 1 | 6 | 0 |
| `.exe` | 2 | 0 | 2 |
| `.json` | 6 | 6.108 | 0 |
| `.md` | 3 | 313 | 0 |
| `.png` | 1 | 0 | 1 |
| `.yml` | 9 | 471 | 0 |
