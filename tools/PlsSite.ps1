# PlsSite.ps1 — the publish engine behind the private downloads page.
# Used by Publish-ToSite.ps1 (by hand) and Watch-Builds.ps1 (automatic, from the farm).
# Dot-source after PlsVault.ps1.

function Get-PlsPlatform([string]$FileName) {
  $n = $FileName.ToLowerInvariant()
  if ($n -match '\.(apk|aab)$') { return 'android' }
  if ($n -match '\.(exe|msi|msix)$') { return 'windows' }
  if ($n -match '\.crx$') { return 'chrome' }
  if ($n -match '\.zip$') {
    if ($n -match 'source|src|art[-_ ]?pack|face[-_ ]?pack|assets|symbols|logs?\b') { return $null }
    if ($n -match 'chrome|extension|-ext\b|crx') { return 'chrome' }
    if ($n -match '-pc|windows|win64|win32|-win\b|desktop|-exe') { return 'windows' }
  }
  return $null
}

# Renamed products: tools\renames.json maps an old file-name prefix to the new one, e.g. { "PulseAIDA64": "Pulse64" }.
# Applied before grouping, so builds under the old name fold into the new product's card and history.
$PlsRenamesPath = Join-Path $PSScriptRoot 'renames.json'
function ConvertTo-PlsId([string]$Raw) { ($Raw.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-') }
function Get-PlsRenames {
  $map = @{}   # old id -> new raw name
  if ($PlsRenamesPath -and (Test-Path $PlsRenamesPath)) {
    $j = Get-Content $PlsRenamesPath -Raw | ConvertFrom-Json
    foreach ($p in $j.PSObject.Properties) { if ($p.Name -notlike '_*' -and $p.Value) { $map[(ConvertTo-PlsId $p.Name)] = [string]$p.Value } }
  }
  return $map
}
function Resolve-PlsRename([string]$Raw) {
  $map = Get-PlsRenames
  for ($i = 0; $i -lt 10; $i++) {   # follows chains (A -> B -> C); the cap stops a loop in a bad map
    $to = $map[(ConvertTo-PlsId $Raw)]
    if (-not $to -or (ConvertTo-PlsId $to) -eq (ConvertTo-PlsId $Raw)) { break }
    $Raw = $to
  }
  return $Raw
}

# "KeyboardStudio-v1.24.138-vc242-Android-APK.apk" -> id keyboardstudio, name "Keyboard Studio", version 1.24.138-vc242
function Get-PlsProductKey([string]$FileName) {
  $base = [IO.Path]::GetFileNameWithoutExtension($FileName)
  $m = [regex]::Match($base, '^(?<name>.+?)[-_ ]+v?(?<ver>\d+(?:\.\d+)+(?:[-_.]?vc\d+)?)', 'IgnoreCase')
  if (-not $m.Success) { return $null }
  $raw = Resolve-PlsRename $m.Groups['name'].Value
  $id = ($raw.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  $nice = ($raw -replace '[-_]+', ' ') -creplace '(?<=[a-z])(?=[A-Z])', ' '
  return [pscustomobject]@{ id = $id; name = $nice.Trim(); version = $m.Groups['ver'].Value }
}

function Get-PlsApkSigner([string]$Path) {
  $aps = Get-Command apksigner -ErrorAction SilentlyContinue
  if (-not $aps -and $env:ANDROID_HOME) { $aps = Get-ChildItem "$env:ANDROID_HOME\build-tools\*\apksigner.bat" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1 }
  if (-not $aps -and $env:LOCALAPPDATA) { $aps = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools\*\apksigner.bat" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1 }
  if (-not $aps) { return 'unknown' }
  $out = & $aps verify --print-certs $Path 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { return 'broken' }
  if ($out -match 'CN=Android Debug') { return 'debug' }
  return 'release'
}

function New-PlsBlobName { (((Get-PlsRandom 10) | ForEach-Object { $_.ToString('x2') }) -join '') + '.bin' }

<#
  Invoke-PlsPublish -Updates @( @{
      id='pls-pdf'; name='PLS PDF'; purpose='...'; bullets=@('...'); description='...'
      icon='C:\path\icon.png'; shots=@(@{ path='C:\s1.png'; caption='Start screen' })
      files=@(@{ path='C:\x.apk'; platform='android'; version='1.4.0'; notes='...'; source='repo@tag'; buildDate='2026-11-16'; releaseDate='2026-11-16' })
  } )
  Seals every file with its own key, uploads to the "vault" release, updates the encrypted list,
  pushes once, and retires the builds/pictures that were replaced. Returns the number of changes.
#>
function Invoke-PlsPublish {
  param([Parameter(Mandatory)]$Updates, [Parameter(Mandatory)][string]$RepoPath, [Parameter(Mandatory)][byte[]]$MK,
        [string]$Repo = 'jstetson-bit/pulselabsstudio-site', [string]$Message = 'Vault: publish', $Watcher, [int]$Keep = $(if ($env:PLS_KEEP_PER_SHELF) { [int]$env:PLS_KEEP_PER_SHELF } else { 8 }), $Tickets, [switch]$DryRun, [scriptblock]$Log = { param($m) Write-Host "[publish] $m" -ForegroundColor Cyan })
  $work = Join-Path ([IO.Path]::GetTempPath()) ('pls-seal-' + (New-PlsBlobName).Replace('.bin',''))
  New-Item -ItemType Directory -Force $work | Out-Null
  $upload = New-Object Collections.ArrayList; $retire = New-Object Collections.ArrayList
  $seal = {
    param([string]$path)
    $k = Get-PlsRandom 64; $name = New-PlsBlobName
    [IO.File]::WriteAllBytes((Join-Path $work $name), (Protect-PlsBytes $k ([IO.File]::ReadAllBytes($path))))
    [void]$upload.Add((Join-Path $work $name))
    return [pscustomobject]@{ b = $name; k = [Convert]::ToBase64String($k) }
  }
  Push-Location $RepoPath
  try {
    git pull --ff-only -q 2>$null | Out-Null
    $vault = Read-PlsVault $RepoPath
    $man = Get-PlsManifest $vault $MK
    $list = New-Object Collections.ArrayList; foreach ($x in @($man.products)) { if ($x) { [void]$list.Add($x) } }
    $today = (Get-Date).ToString('yyyy-MM-dd')
    $changes = 0

    foreach ($u in @($Updates)) {
      $p = $list | Where-Object { $_.id -eq $u.id } | Select-Object -First 1
      if (-not $p) {
        $p = [pscustomobject]@{ id = $u.id; name = $(if ($u.name) { $u.name } else { $u.id }); purpose = ''; bullets = @(); description = ''; icon = $null; shots = @(); downloads = @() }
        [void]$list.Add($p); & $Log "New product: $($p.name)"
      }
      foreach ($f in 'name','purpose','description') { if ($u.$f) { $p.$f = $u.$f } }
      if ($u.bullets) { $p.bullets = @($u.bullets) }
      if ($u.status) { $p | Add-Member -Force -NotePropertyName status -NotePropertyValue $u.status }
      if ($u.icon) { if ($p.icon) { [void]$retire.Add($p.icon.b) }; $p.icon = & $seal $u.icon }
      if ($u.shots) {
        foreach ($s in @($p.shots)) { if ($s) { [void]$retire.Add($s.b) } }
        $p.shots = @($u.shots | ForEach-Object { $r = & $seal $_.path; $r | Add-Member -NotePropertyName caption -NotePropertyValue ([string]$_.caption) -PassThru })
      }
      $old = @($p.downloads | Where-Object { $_ })
      $new = @()
      foreach ($f in @($u.files | Where-Object { $_ })) {
        if ($f.archivedOnly) {
          # history only: no file on the site, the farm Release keeps it
          $new += [pscustomobject]@{
            platform = $f.platform; version = $f.version; file = $f.fileName; size = [long]$f.assetSize; signer = 'n/a'; sha256 = ''
            buildDate = $f.releaseDate; releaseDate = $f.releaseDate; published = (Get-Date).ToString('o'); releasedAt = [string]$f.releasedAt
            notes = [string]$f.notes; source = [string]$f.source; sourceUrl = [string]$f.sourceUrl; archived = $true; b = $null; k = $null }
          $changes++; continue
        }
        $fi = Get-Item -LiteralPath $f.path
        if ($fi.Length -ge 1.5GB) { & $Log "SKIPPED $($fi.Name): over 1.5 GB"; continue }
        $signer = $(if ($f.signer) { $f.signer } elseif ($f.platform -eq 'android') { Get-PlsApkSigner $fi.FullName } else { 'n/a' })
        if ($signer -eq 'broken') { & $Log "SKIPPED $($fi.Name): fails signature verification"; continue }
        $sealed = & $seal $fi.FullName
        $new += [pscustomobject]@{
          platform = $f.platform; version = $f.version; file = $fi.Name; size = $fi.Length; signer = $signer
          sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $fi.FullName).Hash.ToLower()
          buildDate = $(if ($f.buildDate) { $f.buildDate } else { $fi.LastWriteTime.ToString('yyyy-MM-dd') })
          releaseDate = $(if ($f.releaseDate) { $f.releaseDate } else { $today })
          published = (Get-Date).ToString('o'); releasedAt = $(if ($f.releasedAt) { [string]$f.releasedAt } else { (Get-Date).ToUniversalTime().ToString('o') }); notes = [string]$f.notes; source = [string]$f.source
          sourceUrl = [string]$f.sourceUrl; archived = $false; b = $sealed.b; k = $sealed.k
        }
        & $Log ("{0}: {1} {2} ({3}, {4:N1} MB, {5})" -f $p.name, $f.platform, $f.version, $fi.Name, ($fi.Length / 1MB), $signer)
        $changes++
      }
      # newest first (by when the farm released it), so the history reads top-down
      $new = @($new | Sort-Object { [string]$_.releasedAt } -Descending)
      $old = @($old | Sort-Object { [string]$_.releasedAt } -Descending)
      # History: every build is kept, newest first. The newest $Keep per shelf stay downloadable here; older ones are
      # "archived" (their file leaves the site to save space, but the entry, its changelog and its farm Release link stay).
      $all = @(@($new) + @($old | Where-Object { $o = $_; -not ($new | Where-Object { $_.platform -eq $o.platform -and $_.version -eq $o.version }) }) | Sort-Object { [string]$_.releasedAt } -Descending)
      foreach ($dup in @($old | Where-Object { $o = $_; $new | Where-Object { $_.platform -eq $o.platform -and $_.version -eq $o.version } })) { if ($dup.b) { [void]$retire.Add($dup.b) } }
      $kept = @()
      foreach ($pl in @($all | ForEach-Object { $_.platform } | Select-Object -Unique)) {
        $i = 0
        foreach ($d in @($all | Where-Object { $_.platform -eq $pl })) {
          $i++
          if ($i -gt $Keep -and $d.b) {
            [void]$retire.Add($d.b)
            $d.b = $null; $d.k = $null
            if ($d.PSObject.Properties['archived']) { $d.archived = $true } else { $d | Add-Member -NotePropertyName archived -NotePropertyValue $true }
          }
          $kept += $d
        }
      }
      $p.downloads = @($kept)
      if ($u.icon -or $u.shots -or $u.purpose -or $u.bullets -or $u.description -or $u.status) { $changes++ }
    }

    if ($Watcher) { $man | Add-Member -Force -NotePropertyName watcher -NotePropertyValue $Watcher; $changes++ }
    if ($Tickets) { $man | Add-Member -Force -NotePropertyName tickets -NotePropertyValue $Tickets; $changes++ }
    if ($changes -eq 0) { return 0 }
    $man.products = @($list | Sort-Object name)
    $man.updated = $today
    if (-not $man.PSObject.Properties['v']) { $man | Add-Member -NotePropertyName v -NotePropertyValue 2 } else { $man.v = 2 }
    Set-PlsManifest $vault $MK $man

    if ($DryRun) { & $Log "DRY RUN: would upload $($upload.Count) encrypted file(s), retire $($retire.Count)."; return $changes }

    if ($upload.Count) {
      gh release view vault --repo $Repo *> $null
      if ($LASTEXITCODE -ne 0) { gh release create vault --repo $Repo --title 'vault' --notes 'Encrypted storage for the private downloads page. Contents are unreadable without the key.' *> $null }
      $arr = [string[]]$upload.ToArray()
      gh release upload vault @arr --repo $Repo --clobber
      if ($LASTEXITCODE -ne 0) { throw 'Upload to the vault release failed; nothing on the site changed.' }
    }
    Write-PlsVault $RepoPath $vault
    git add vault/vault.json | Out-Null
    git commit -q -m $Message | Out-Null
    git push -q 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      git pull --rebase -q 2>$null | Out-Null; git push -q 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'git push failed (files are uploaded; the next run retries the list).' }
    }
    foreach ($b in $retire) { if ($b) { gh release delete-asset vault $b --repo $Repo -y *> $null } }
    return $changes
  }
  finally { Pop-Location; Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }
}
