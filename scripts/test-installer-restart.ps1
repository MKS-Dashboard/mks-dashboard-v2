$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$nsis = Get-ChildItem (Join-Path $env:LOCALAPPDATA "electron-builder\Cache") -Filter makensis.exe -Recurse |
    Where-Object { $_.Directory.Name -eq "Bin" } | Select-Object -First 1
if (!$nsis) { throw "Bouw eerst de Windows-installer om de NSIS-compiler beschikbaar te maken." }
$folder = Join-Path ([System.IO.Path]::GetTempPath()) ("mks-restart-test-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $folder | Out-Null
try {
    $helper = Join-Path $folder "helper.cs"
    @'
using System;
using System.IO;
class RestartHelper {
    static void Main(string[] args) {
        File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "started.txt"), String.Join(" ", args) + "\n");
    }
}
'@ | Set-Content -LiteralPath $helper
    & $compiler /nologo /target:winexe "/out:$folder\helper.exe" $helper
    if ($LASTEXITCODE -ne 0) { throw "Testhelper compileren is mislukt." }

    $cases = @(
        @{ Updated = 1; ForceRun = 0; Silent = $false },
        @{ Updated = 1; ForceRun = 1; Silent = $true },
        @{ Updated = 0; ForceRun = 1; Silent = $true },
        @{ Updated = 1; ForceRun = 1; Silent = $false }
    )
    foreach ($case in $cases) {
        $fixture = @'
!include "MUI2.nsh"
!include "LogicLib.nsh"
Name "MKS restart test"
OutFile "@FOLDER@\test.exe"
RequestExecutionLevel user
Var appExe
!define isUpdated '@UPDATED@ == 1'
!define isForceRun '@FORCE@ == 1'
!define UAC_IsAdmin '0 == 1'
!macro UnexpectedElevation result path verb args
  StrCpy ${result} "error"
!macroend
!define StdUtils.ExecShellAsUser "!insertmacro UnexpectedElevation"
!include "@ROOT@\build\installer.nsh"
!insertmacro customPageAfterChangeDir
!insertmacro MUI_PAGE_INSTFILES
!insertmacro customFinishPage
!insertmacro MUI_LANGUAGE "English"
Section
  StrCpy $INSTDIR "@FOLDER@"
  StrCpy $appExe "@FOLDER@\helper.exe"
  !insertmacro customInstall
SectionEnd
'@
        $fixture.Replace("@FOLDER@", $folder).Replace("@ROOT@", $root).
            Replace("@FORCE@", [string]$case.ForceRun).Replace("@UPDATED@", [string]$case.Updated) |
            Set-Content -LiteralPath (Join-Path $folder "test.nsi")
        & $nsis.FullName /V2 (Join-Path $folder "test.nsi")
        if ($LASTEXITCODE -ne 0) { throw "Testinstaller compileren is mislukt." }
        if ($case.Silent) {
            $process = Start-Process (Join-Path $folder "test.exe") -ArgumentList "/S" -PassThru
        } else {
            $process = Start-Process (Join-Path $folder "test.exe") -PassThru
        }
        if (!$process.WaitForExit(15000)) {
            $process.Kill()
            throw "De update-installer sluit niet automatisch."
        }
        Start-Sleep -Milliseconds 500
        $marker = Join-Path $folder "started.txt"
        $shouldStart = $case.Updated -eq 1 -and $case.ForceRun -eq 1 -and !$case.Silent
        if (!$shouldStart -and (Test-Path $marker)) { throw "App onterecht gestart door de update-hook." }
        if ($shouldStart) {
            if (!(Test-Path $marker)) { throw "App is niet opnieuw gestart." }
            $lines = @(Get-Content -LiteralPath $marker)
            if ($lines.Count -ne 1 -or $lines[0] -ne "--updated") { throw "App dubbel gestart of verkeerde argumenten." }
        }
    }
    Write-Output "Installer sluit automatisch; herstart exact eenmaal en alleen op verzoek."
} finally {
    foreach ($name in @("helper.cs", "helper.exe", "test.nsi", "test.exe", "started.txt")) {
        $path = Join-Path $folder $name
        if (Test-Path $path) { Remove-Item -LiteralPath $path }
    }
    Remove-Item -LiteralPath $folder
}
