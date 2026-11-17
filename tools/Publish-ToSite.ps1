<#
  Publish-ToSite.ps1 — the farm's back door into the PRIVATE downloads vault on pulselabsstudio.com

  Encrypts finished builds (and their pictures) with the vault master key, uploads the scrambled
  files to the "vault" GitHub Release under random names, and updates the encrypted product list.
  The site redeploys itself in a minute or two. Nobody without a name + password can see what's
  there, let alone download it. Plain PowerShell + git + gh: no Claude, no tokens.

  Which shelf it lands on is automatic:  .apk/.aab -> Droid   .exe/.msi/.msix/.zip -> PC   .crx -> Chrome
  A Chrome extension packed as .zip needs  -Platform chrome

  First time for a product:
    .\Publish-ToSite.ps1 -Id pls-pdf -Name "PLS PDF" -Tagline "Read, sign, merge and build PDFs. Offline." `
        -Description "..." -Icon .\icon.png -Screenshots .\s1.png,.\s2.png `
        -Version 1.4.0 -Files .\PLSPDF-v1.4.0-Android-APK.apk,.\PLSPDF-v1.4.0-PC-exe.zip -Notes "What changed"
  After that:
    .\Publish-ToSite.ps1 -Id pls-pdf -Version 1.4.1 -Files .\PLSPDF-v1.4.1-Android-APK.apk -Notes "Fixed X"

  -DryRun shows what would happen without uploading or pushing.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Id,
  [Parameter(Mandatory)][string]$Version,
  [Parameter(Mandatory)][string[]]$Files,
  [ValidateSet('android','windows','chrome')][string]$Platform,
  [string]$Name, [string]$Tagline, [string]$Description, [string]$Notes,
  [string]$Icon, [string[]]$Screenshots,
  [string]$BuildDate,
  [string]$KeyPath, [string]$RepoPath,
  [string]$Repo = 'jstetson-bit/pulselabsstudio-site',
  [switch]$AllowDebugSigned,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
function Say($m) { Write-Host "[publish] $m" -ForegroundColor Cyan }
function Die($m) { Write-Host "[publish] STOPPED: $m" -ForegroundColor Red; exit 1 }
function New-BlobName { ((Get-PlsRandom 10) | ForEach-Object { $_.ToString('x2') }) -join '' }

foreach ($t in 'git','gh') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Die "$t is not installed on this machine." } }
if (-not (Test-Path $RepoPath)) { git clone "https://github.com/$Repo" $RepoPath | Out-Null }
$mk = Get-PlsMasterKey $KeyPath
$work = Join-Path ([IO.Path]::GetTempPath()) ("pls-publish-" + (New-BlobName))
New-Item -ItemType Directory -Force $work | Out-Null

Push-Location $RepoPath
try {
  git pull --ff-only | Out-Null
  $vault = Read-PlsVault $RepoPath
  $man = Get-PlsManifest $vault $mk
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $upload = @()      # encrypted files to send
  $retire = @()      # old blobs no longer used

  function Seal-File([string]$path) {
    $name = (New-BlobName) + '.bin'
    $bytes = [IO.File]::ReadAllBytes((Resolve-Path $path))
    [IO.File]::WriteAllBytes((Join-Path $work $name), (Protect-PlsBytes $mk $bytes))
    $script:upload += (Join-Path $work $name)
    return $name
  }

  $entries = @()
  foreach ($f in $Files) {
    $fi = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
    if (-not $fi) { Die "File not found: $f" }
    $plat = $Platform
    if (-not $plat) {
      switch -Regex ($fi.Extension.ToLower()) {
        '^\.(apk|aab)$'             { $plat = 'android' }
        '^\.(exe|msi|msix|zip)$'    { $plat = 'windows' }
        '^\.crx$'                   { $plat = 'chrome' }
        default { Die "Don't know which shelf $($fi.Name) goes on. Add -Platform android|windows|chrome." }
      }
    }
    if ($fi.Length -ge 1.5GB) { Die "$($fi.Name) is too big for the vault (1.5 GB max)." }

    # Safety net: never ship a debug-signed APK (house signing rule).
    if ($plat -eq 'android' -and -not $AllowDebugSigned) {
      $aps = Get-Command apksigner -ErrorAction SilentlyContinue
      if (-not $aps -and $env:ANDROID_HOME) { $aps = Get-ChildItem "$env:ANDROID_HOME\build-tools\*\apksigner.bat" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1 }
      if ($aps) {
        $certs = & $aps verify --print-certs $fi.FullName 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { Die "$($fi.Name) fails signature verification:`n$certs" }
        if ($certs -match 'CN=Android Debug') { Die "$($fi.Name) is DEBUG-signed. Use the release build (or add -AllowDebugSigned for a test build)." }
        Say "$($fi.Name): signature OK"
      } else { Say "apksigner not found; skipped the debug-signer check for $($fi.Name)" }
    }

    $entries += [pscustomobject]@{
      platform = $plat; version = $Version; file = $fi.Name; size = $fi.Length
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $fi.FullName).Hash.ToLower()
      buildDate = $(if ($BuildDate) { $BuildDate } else { $fi.LastWriteTime.ToString('yyyy-MM-dd') })
      releaseDate = $today; notes = $Notes; blob = (Seal-File $fi.FullName)
    }
    Say ("{0} -> {1}, {2:N1} MB, encrypted" -f $fi.Name, $plat, ($fi.Length / 1MB))
  }

  $list = @($man.products)
  $p = $list | Where-Object { $_.id -eq $Id } | Select-Object -First 1
  if (-not $p) {
    if (-not $Name) { Die "First publish of '$Id' needs -Name (and ideally -Tagline, -Description, -Icon, -Screenshots)." }
    $p = [pscustomobject]@{ id = $Id; name = $Name; tagline = ''; description = ''; icon = $null; screenshots = @(); downloads = @() }
    $list += $p
  }
  if ($Name) { $p.name = $Name }
  if ($Tagline) { $p.tagline = $Tagline }
  if ($Description) { $p.description = $Description }
  if ($Icon) { if ($p.icon) { $retire += $p.icon }; $p.icon = Seal-File $Icon }
  if ($Screenshots) { $retire += @($p.screenshots); $p.screenshots = @($Screenshots | ForEach-Object { Seal-File $_ }) }

  # Keep only the newest build per shelf; the replaced one is retired from the vault.
  $newPlats = @($entries | ForEach-Object { $_.platform })
  $old = @($p.downloads)
  $retire += @($old | Where-Object { $newPlats -contains $_.platform } | ForEach-Object { $_.blob })
  $p.downloads = @($entries) + @($old | Where-Object { $newPlats -notcontains $_.platform })
  $man.products = @($list)
  $man.updated = $today
  Set-PlsManifest $vault $mk $man

  if ($DryRun) {
    Say "DRY RUN. Would upload $($upload.Count) encrypted file(s) and retire $(@($retire | Where-Object { $_ }).Count). New card:"
    $p | ConvertTo-Json -Depth 6; return
  }

  gh release view vault --repo $Repo *> $null
  if ($LASTEXITCODE -ne 0) { gh release create vault --repo $Repo --title 'vault' --notes 'Encrypted storage for the private downloads page. Contents are unreadable without the key.' | Out-Null }
  gh release upload vault @upload --repo $Repo --clobber
  if ($LASTEXITCODE -ne 0) { Die 'Upload to the vault failed. Nothing on the site changed.' }

  Write-PlsVault $RepoPath $vault
  git add vault/vault.json | Out-Null
  git commit -m "Vault: publish $Id $Version" | Out-Null
  git push | Out-Null
  if ($LASTEXITCODE -ne 0) { Die 'git push failed (files are uploaded; rerun to retry).' }

  foreach ($b in ($retire | Where-Object { $_ })) { gh release delete-asset vault $b --repo $Repo -y *> $null }
  Say "Published. Live in about 2 minutes: https://pulselabsstudio.com/downloads.html"
}
finally { Pop-Location; Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }
