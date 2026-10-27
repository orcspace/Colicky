param([switch]$Prepare, [switch]$Launch)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
    if ($Prepare -or -not (Test-Path '.cache/original/lib/app/HeyClicky.exe')) {
        python scripts/recover.py --prepare-only
        if ($LASTEXITCODE -ne 0) { throw 'Dependency preparation failed.' }
    }
    dotnet build Source/HeyClicky/HeyClicky.csproj -c Release -m:1 -nr:false
    if ($LASTEXITCODE -ne 0) { throw 'Source build failed. No runnable package was created.' }
    $destination = Join-Path $root 'artifacts/runtime'
    New-Item -ItemType Directory -Force $destination | Out-Null
    Copy-Item '.cache/original/lib/app/*' $destination -Recurse -Force
    foreach ($module in @('HeyClicky.Contracts', 'HeyClicky.Core', 'HeyClicky.Platform', 'HeyClicky.Drawing3D', 'HeyClicky.Drawing', 'HeyClicky.Agents', 'HeyClicky')) {
        Copy-Item "Source/$module/bin/Release/net9.0/$module.dll" $destination -Force
    }
    Write-Host "Rebuilt managed modules staged with original native dependencies in $destination"
    Write-Host 'This output still requires a Windows UI launch test and working backend services.'
    if ($Launch) {
        if ($env:OS -ne 'Windows_NT') { throw 'Launch requires Windows x64.' }
        Start-Process -FilePath (Join-Path $destination 'HeyClicky.exe') -WorkingDirectory $destination
    }
} finally { Pop-Location }
