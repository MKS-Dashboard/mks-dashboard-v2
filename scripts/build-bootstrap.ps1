$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path $compiler)) { throw "De Windows .NET Framework C#-compiler ontbreekt." }

$png = [System.IO.File]::ReadAllBytes((Join-Path $root "build\icon.png"))
$icon = Join-Path $root "install\bootstrap.ico"
$stream = [System.IO.File]::Create($icon)
$writer = New-Object System.IO.BinaryWriter $stream
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]1)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$png.Length)
    $writer.Write([uint32]22)
    $writer.Write($png)
} finally { $writer.Dispose() }

try {
    foreach ($channel in @("Stable", "Beta")) {
    $defines = if ($channel -eq "Beta") { "/define:BETA" } else { "/define:STABLE" }
    & $compiler /nologo /target:winexe /optimize+ $defines "/win32icon:$icon" `
        /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll `
        "/out:$(Join-Path $root "install\MKS-Dashboard-Setup-$channel.exe")" (Join-Path $root "install\Bootstrap.cs")
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap-installer bouwen is mislukt." }
    }
} finally { Remove-Item -LiteralPath $icon }

$testExe = Join-Path ([System.IO.Path]::GetTempPath()) ("mks-bootstrap-test-" + [guid]::NewGuid().ToString("N") + ".exe")
try {
    & $compiler /nologo /target:exe /main:BootstrapTests `
        /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll `
        "/out:$testExe" (Join-Path $root "install\Bootstrap.cs") (Join-Path $root "scripts\bootstrap.test.cs")
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap-tests compileren is mislukt." }
    & $testExe
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap-tests zijn mislukt." }
} finally { if (Test-Path $testExe) { Remove-Item -LiteralPath $testExe } }
