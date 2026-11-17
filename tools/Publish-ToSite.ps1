<#
  Publish-ToSite.ps1  —  the farm's "back door" to pulselabsstudio.com/downloads

  Takes finished build files (APK / exe / zip) from a farm machine, uploads them to a
  GitHub Release on jstetson-bit/pulselabsstudio-site, and adds/updates the product's
  jump card in products.json. GitHub Pages republishes the site on its own a minute later.

  Local, token-free: plain PowerShell + git + gh (GitHub CLI). No Claude needed unless it fails.

  First time for a product (sets name/description/pictures):
    .\Publish-ToSite.ps1 -Id pls-pdf -Name "PLS PDF" -Tagline "Read, sign, merge and build PDFs. Offline." `
        -Description "Long description..." -Icon .\icon.png -Screenshots .\s1.png,.\s2.png `
        -Version 1.4.0 -Files .\PLSPDF-v1.4.0-Android-APK.apk,.\PLSPDF-v1.4.0-PC-exe.zip -Notes "What changed..."

  Every release after that:
    .\Publish-ToSite.ps1 -Id pls-pdf -Version 1.4.1 -Files .\PLSPDF-v1.4.1-Android-APK.apk -Notes "Fixed X"

  Add -DryRun to see what would happen without uploading or pushing.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Id,
  [Parameter(Mandatory)][string]$Version,
  [Parameter(Mandatory)][string[]]$Files,
  [string]$Name, [string]$Tagline, [string]$Description, [string]$Notes,
  [string]$Icon, [string[]]$Screenshots,
  [string]$BuildDate,                       # yyyy-MM-dd; defaults to each file's last-write date
  [string]$RepoPath = $(if ($env:PLS_SITE_REPO) { $env:PLS_SITE_REPO } else { 'C:\PulseLabs\pulselabsstudio-site' }),
  [string]$Repo = 'jstetson-bit/pulselabsstudio-site',
  [switch]$AllowDebugSigned,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
function Say($m) { Write-Host "[publish] $m" -ForegroundColor Cyan }
function Die($m) { Write-Host "[publish] STOPPED: $m" -ForegroundColor Red; exit 1 }

foreach ($t in 'git','gh') { if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Die "$t is not installed on this machine." } }
if (-not (Test-Path $RepoPath)) { Say "Cloning site repo to $RepoPath"; git clone "https://github.com/$Repo" $RepoPath | Out-Null }
Push-Location $RepoPath
try {
  git pull --ff-only | Out-Null

  $today = (Get-Date).ToString('yyyy-MM-dd')
  $tag = "$Id-v$Version"
  $entries = @()
  foreach ($f in $Files) {
    $fi = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
    if (-not $fi) { Die "File not found: $f" }
    if ($fi.Name -match '\s') { Die "File name has spaces (GitHub mangles those): $($fi.Name)" }
    $plat = switch -Regex ($fi.Extension.ToLower()) { '^\.(apk|aab)$' {'android'} '^\.(exe|zip|msi|msix)$' {'windows'} default { Die "Don't know which platform $($fi.Name) is for." } }
    if ($fi.Length -ge 2GB) { Die "$($fi.Name) is over GitHub's 2 GB per-file limit." }

    # Safety net: public downloads must not be debug-signed (house signing rule).
    if ($plat -eq 'android' -and -not $AllowDebugSigned) {
      $aps = Get-Command apksigner -ErrorAction SilentlyContinue
      if (-not $aps -and $env:ANDROID_HOME) { $aps = Get-ChildItem "$env:ANDROID_HOME\build-tools\*\apksigner.bat" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1 }
      if ($aps) {
        $certs = & $aps verify --print-certs $fi.FullName 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { Die "$($fi.Name) fails signature verification:`n$certs" }
        if ($certs -match 'CN=Android Debug') { Die "$($fi.Name) is DEBUG-signed. Public downloads need the release key (or pass -AllowDebugSigned)." }
        Say "$($fi.Name): signature OK"
      } else { Say "apksigner not found; skipping the debug-signer check for $($fi.Name)" }
    }

    $entries += [ordered]@{
      platform    = $plat
      version     = $Version
      file        = $fi.Name
      size        = $fi.Length
      sha256      = (Get-FileHash -Algorithm SHA256 -LiteralPath $fi.FullName).Hash.ToLower()
      buildDate   = $(if ($BuildDate) { $BuildDate } else { $fi.LastWriteTime.ToString('yyyy-MM-dd') })
      releaseDate = $today
      url         = "https://github.com/$Repo/releases/download/$tag/$($fi.Name)"
      notes       = $Notes
    }
    Say ("{0} -> {1}, {2:N1} MB" -f $fi.Name, $plat, ($fi.Length / 1MB))
  }

  # Pictures live in the repo (small), binaries live in Releases (big).
  $media = Join-Path $RepoPath "media\$Id"
  $shotPaths = @(); $iconPath = $null
  if ($Icon -or $Screenshots) { New-Item -ItemType Directory -Force $media | Out-Null }
  if ($Icon) { $ext = [IO.Path]::GetExtension($Icon); Copy-Item $Icon "$media\icon$ext" -Force; $iconPath = "media/$Id/icon$ext" }
  $i = 0; foreach ($s in $Screenshots) { $i++; $ext = [IO.Path]::GetExtension($s); Copy-Item $s "$media\shot$i$ext" -Force; $shotPaths += "media/$Id/shot$i$ext" }

  # Update products.json
  $pj = Get-Content products.json -Raw | ConvertFrom-Json
  $list = @($pj.products)
  $p = $list | Where-Object { $_.id -eq $Id } | Select-Object -First 1
  if (-not $p) {
    if (-not $Name) { Die "First publish of '$Id' needs -Name (and ideally -Tagline, -Description, -Icon, -Screenshots)." }
    $p = [pscustomobject]@{ id = $Id; name = $Name; tagline = ''; description = ''; icon = $null; screenshots = @(); downloads = @() }
    $list += $p
  }
  if ($Name) { $p.name = $Name }
  if ($Tagline) { $p.tagline = $Tagline }
  if ($Description) { $p.description = $Description }
  if ($iconPath) { $p.icon = $iconPath }
  if ($shotPaths.Count) { $p.screenshots = $shotPaths }
  $keep = @($p.downloads | Where-Object { -not ($_.version -eq $Version -and ($entries.platform -contains $_.platform)) })
  $p.downloads = @($entries | ForEach-Object { [pscustomobject]$_ }) + $keep
  $pj.products = $list
  $pj.updated = $today

  if ($DryRun) { Say "DRY RUN — would create release $tag and write:"; $pj | ConvertTo-Json -Depth 10; return }

  # Upload (create the release, or add to it if it already exists)
  $paths = $Files | ForEach-Object { (Get-Item -LiteralPath $_).FullName }
  gh release view $tag --repo $Repo *> $null
  if ($LASTEXITCODE -eq 0) { gh release upload $tag @paths --repo $Repo --clobber }
  else { gh release create $tag @paths --repo $Repo --title "$($p.name) $Version" --notes ($(if ($Notes) { $Notes } else { "$($p.name) $Version" })) }
  if ($LASTEXITCODE -ne 0) { Die "Upload to GitHub Releases failed." }

  $json = $pj | ConvertTo-Json -Depth 10
  [IO.File]::WriteAllText((Join-Path $RepoPath 'products.json'), $json, (New-Object Text.UTF8Encoding $false))
  git add products.json media | Out-Null
  git commit -m "Publish $($p.name) $Version" | Out-Null
  git push | Out-Null
  if ($LASTEXITCODE -ne 0) { Die "git push failed (files ARE uploaded; rerun to retry the card update)." }
  Say "Live in about a minute: https://pulselabsstudio.com/downloads.html#$Id"
}
finally { Pop-Location }
