# Pulse farm machine bootstrap (HQ, 2026-11-19): Git + Java 17 + Android SDK 37 + bench kit + HQ Feed + guest-list door.
# Run in an ADMIN PowerShell window. Safe to re-run: skips what is already installed. Nothing is deleted.
$ErrorActionPreference = 'Continue'
$m = $env:COMPUTERNAME
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { winget install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements; $env:Path += ';C:\Program Files\Git\cmd' }
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { winget install -e --id EclipseAdoptium.Temurin.17.JDK --silent --accept-package-agreements --accept-source-agreements; $jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1 }
if ($jdk) { [Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk.FullName, 'Machine'); $env:JAVA_HOME = $jdk.FullName; $env:Path = "$($jdk.FullName)\bin;$env:Path" } else { 'NO JAVA 17 - stop here and tell HQ'; exit 1 }
$sdk = @($env:ANDROID_HOME, [Environment]::GetEnvironmentVariable('ANDROID_HOME','Machine'), [Environment]::GetEnvironmentVariable('ANDROID_HOME','User'), "$env:LOCALAPPDATA\Android\Sdk", 'C:\Android\Sdk') | Where-Object { $_ -and (Test-Path "$_\cmdline-tools\latest\bin\sdkmanager.bat") } | Select-Object -First 1
if (-not $sdk) {
 $sdk = 'C:\Android\Sdk'; $t = "$env:TEMP\cmdtools-$(Get-Date -f yyyyMMddHHmmss)"
 Invoke-WebRequest -UseBasicParsing 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' -OutFile "$t.zip"
 Expand-Archive "$t.zip" -DestinationPath $t
 New-Item -ItemType Directory -Force "$sdk\cmdline-tools" | Out-Null
 Move-Item "$t\cmdline-tools" "$sdk\cmdline-tools\latest"
}
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'Machine'); $env:ANDROID_HOME = $sdk
$d = "$env:TEMP\farm-$(Get-Date -f yyyyMMddHHmmss)"
git clone -q https://github.com/jstetson-bit/gundam-farm-note20 $d
Set-Location $d
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\farm-seat\Install-BenchKit.ps1 -Repo $d
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\hq-feed\Install-HqFeed.ps1 -Machine $m
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\farm-queue\Install-FarmDoor.ps1
git pull -q; Copy-Item C:\PulseBench\kit.json "docs\farm\bench-kit-$m.json" -Force; git add "docs/farm/bench-kit-$m.json"; git commit -qm "farm: bench kit + SDK 37 + guest list on $m"; git push -q
"$m done - HQ can read docs/farm/bench-kit-$m.json"
