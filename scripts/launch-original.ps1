param([switch]$Prepare)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not [Environment]::Is64BitOperatingSystem -or -not $IsWindows -and $PSVersionTable.PSVersion.Major -ge 6) {
    throw 'The recovered Windows runtime requires Windows x64.'
}
$app = Join-Path $root '.cache/original/lib/app/HeyClicky.exe'
if ($Prepare -or -not (Test-Path $app)) {
    python (Join-Path $PSScriptRoot 'recover.py') --prepare-only
    if ($LASTEXITCODE -ne 0) { throw 'Runtime preparation failed.' }
}
Write-Host 'Starting the ORIGINAL packaged application, not a rebuilt source version.'
Start-Process -FilePath $app -WorkingDirectory (Split-Path $app)
