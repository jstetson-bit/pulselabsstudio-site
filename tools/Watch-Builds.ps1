<#
  Watch-Builds.ps1 — the automatic back door. Runs on a farm machine every 2 minutes (Install-Watcher.ps1).

  Looks at the GitHub Releases on every jstetson-bit repo. A Release is the farm's "built and passed the
  in-house checks" signal (delivery rule). Every new APK / PC exe / PC zip / Chrome extension it finds there
  goes straight into the private downloads vault, newest per product per shelf. Plain PowerShell + gh;
  no tokens. Quiet when nothing is new.

  Skipped on purpose: drafts, Releases whose title/tag/notes say FAIL, source/art/asset zips, files over 1.5 GB.

  Optional extras a project can attach to its Release (all picked up automatically):
    pls-listing.json        { "name", "purpose", "bullets": [..], "description",
                              "shots": [{ "file": "x-shot-1.png", "caption": "Start screen" }], "icon": "x-icon.png" }
    <Name>-shot-<n>-<caption>.png|jpg|webp   picture of a screen (caption from the file name)
    <Name>-icon.png                            app icon
#>
[CmdletBinding()]
param(
  [string]$Owner = 'jstetson-bit',
  [string]$SiteRepo = 'jstetson-bit/pulselabsstudio-site',
  [string]$KeyPath, [string]$RepoPath,
  [string]$StatePath = $(if ($env:PLS_WATCH_STATE) { $env:PLS_WATCH_STATE } else { 'C:\PulseLabs\watcher-state.json' }),
  [string]$LogPath = $(if ($env:PLS_WATCH_LOG) { $env:PLS_WATCH_LOG } else { 'C:\PulseLabs\logs\watcher.log' }),
  [int]$FirstScan = 30,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }

New-Item -ItemType Directory -Force (Split-Path $LogPath) | Out-Null
if ((Test-Path $LogPath) -and (Get-Item $LogPath).Length -gt 1MB) { Move-Item -Force $LogPath "$LogPath.old" }
function Log($m) { $line = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '  ' + $m; Add-Content -Path $LogPath -Value $line; Write-Host $line }

# One run at a time.
$mutex = New-Object Threading.Mutex($false, 'Local\PulseLabsSiteWatcher')
if (-not $mutex.WaitOne(0)) { return }
$work = Join-Path ([IO.Path]::GetTempPath()) 'pls-watch'
try {
  if (-not (Test-Path $RepoPath)) { git clone -q "https://github.com/$SiteRepo" $RepoPath }
  $mk = Get-PlsMasterKey $KeyPath
  $state = @{}
  if (Test-Path $StatePath) { (Get-Content $StatePath -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $state[$_.Name] = $_.Value } }

  $vault = $null; Push-Location $RepoPath; try { git pull --ff-only -q 2>$null | Out-Null; $vault = Read-PlsVault $RepoPath } finally { Pop-Location }
  $man = Get-PlsManifest $vault $mk
  $have = @{}   # "id|platform" -> current entry
  foreach ($p in @($man.products)) { foreach ($d in @($p.downloads)) { if ($d -and -not $have["$($p.id)|$($d.platform)"]) { $have["$($p.id)|$($d.platform)"] = $d } } }

  $repos = gh repo list $Owner --limit 200 --json nameWithOwner --jq '.[].nameWithOwner'
  if ($LASTEXITCODE -ne 0) { throw 'gh repo list failed (is gh signed in for this user?)' }
  $cands = @{}   # "id|platform" -> list of candidates (every build found, for the history)
  $knownSources = @{}; foreach ($p in @($man.products)) { foreach ($d in @($p.downloads)) { if ($d -and $d.source) { $knownSources[[string]$d.source] = 1 } } }
  $extras = @{}  # id -> listing/pictures info
  $newState = @{}
  foreach ($r in $repos) {
    if ($r -eq $SiteRepo) { continue }
    $rels = gh release list --repo $r --limit $FirstScan --json tagName,publishedAt,isDraft,name | ConvertFrom-Json
    if (-not $rels) { continue }
    $seen = $(if ($state[$r]) { [datetime]$state[$r] } else { [datetime]'2000-01-01' })
    $newest = $seen
    foreach ($rel in ($rels | Where-Object { -not $_.isDraft -and $_.publishedAt } | Sort-Object { [datetime]$_.publishedAt })) {
      $pub = [datetime]$rel.publishedAt
      if ($pub -le $seen) { continue }
      if ($pub -gt $newest) { $newest = $pub }
      if ("$($rel.tagName) $($rel.name)" -match '(?i)\bfail') { Log "skip $r@$($rel.tagName): marked FAIL"; continue }
      $v = gh release view $rel.tagName --repo $r --json assets,body | ConvertFrom-Json
      if ($v.body -match '(?i)checks?\s*:\s*fail|failed (in-house )?checks') { Log "skip $r@$($rel.tagName): notes say checks failed"; continue }
      $names = @($v.assets | ForEach-Object { $_.name })
      $relIds = @()
      foreach ($a in $v.assets) {
        $plat = Get-PlsPlatform $a.name; if (-not $plat) { continue }
        $k = Get-PlsProductKey $a.name; if (-not $k) { Log "skip $($a.name): no Name-vX.Y in the file name"; continue }
        if ($a.size -ge 1.5GB) { Log "skip $($a.name): over 1.5 GB"; continue }
        $relIds += $k.id
        $c = [pscustomobject]@{ id = $k.id; name = $k.name; version = $k.version; platform = $plat; repo = $r; tag = $rel.tagName; asset = $a.name; size = [long]$a.size; pub = $pub; body = [string]$v.body }
        $key = "$($k.id)|$plat"
        if (-not $cands[$key]) { $cands[$key] = New-Object Collections.ArrayList }
        [void]$cands[$key].Add($c)
      }
      # Pictures / listing riding along with this Release
      $relIds = @($relIds | Select-Object -Unique)
      if ($relIds.Count) {
        $listing = $names | Where-Object { $_ -match '(?i)listing\.json$' } | Select-Object -First 1
        $shots = @($names | Where-Object { $_ -match '(?i)-shot-?\d*.*\.(png|jpe?g|webp)$' } | Sort-Object)
        $icon = $names | Where-Object { $_ -match '(?i)-icon\.(png|jpe?g|webp)$' } | Select-Object -First 1
        if ($listing -or $shots.Count -or $icon) {
          foreach ($id in $relIds) { $extras[$id] = [pscustomobject]@{ repo = $r; tag = $rel.tagName; listing = $listing; shots = $shots; icon = $icon; pub = $pub } }
        }
      }
    }
    $newState[$r] = $newest.ToString('o')
  }

  # Every build the site doesn't have yet (by its farm Release), newest first. The newest $Keep per shelf are
  # downloaded and stored; older ones become history entries (changelog + link to their farm Release) without a file.
  $Keep = $(if ($env:PLS_KEEP_PER_SHELF) { [int]$env:PLS_KEEP_PER_SHELF } else { 8 })
  $todo = @()
  foreach ($key in @($cands.Keys)) {
    $cur = $have[$key]
    $list = @($cands[$key] | Where-Object { -not $knownSources["$($_.repo)@$($_.tag)/$($_.asset)"] } | Sort-Object pub -Descending)
    $i = 0
    foreach ($c in $list) {
      $i++
      $c | Add-Member -Force -NotePropertyName archivedOnly -NotePropertyValue ($i -gt $Keep)
      $todo += $c
    }
  }
  $extraIds = @($extras.Keys)
  if (-not $todo.Count -and -not $extraIds.Count) {
    foreach ($kv in $newState.GetEnumerator()) { $state[$kv.Key] = $kv.Value }
    if (-not $DryRun) { $state | ConvertTo-Json | Set-Content $StatePath }
    if ($man.watcher -and $man.watcher.error) {
      $null = Invoke-PlsPublish -Updates @() -RepoPath $RepoPath -MK $mk -Watcher ([pscustomobject]@{ ok = (Get-Date).ToString('o'); error = '' }) -Message 'Vault: watcher recovered' -DryRun:$DryRun
    }
    return
  }

  if (Test-Path $work) { Remove-Item -Recurse -Force $work }
  New-Item -ItemType Directory -Force $work | Out-Null
  $byId = @{}
  foreach ($c in $todo) {
    $dir = Join-Path $work ($c.id + '-' + $c.platform + '-' + ($c.tag -replace '[^\w.-]', '_')); New-Item -ItemType Directory -Force $dir | Out-Null
    if (-not $c.archivedOnly) {
      gh release download $c.tag --repo $c.repo --pattern $c.asset --dir $dir --clobber
      if ($LASTEXITCODE -ne 0) { Log "download failed: $($c.repo)@$($c.tag)/$($c.asset)"; continue }
    }
    if (-not $byId[$c.id]) { $byId[$c.id] = @{ id = $c.id; files = @() } }
    if (-not ($have.Keys | Where-Object { $_ -like "$($c.id)|*" })) { $byId[$c.id].name = $c.name }
    $byId[$c.id].files += @{ path = (Join-Path $dir $c.asset); platform = $c.platform; version = $c.version; archivedOnly = [bool]$c.archivedOnly; assetSize = $c.size; fileName = $c.asset
      source = "$($c.repo)@$($c.tag)/$($c.asset)"; sourceUrl = "https://github.com/$($c.repo)/releases/tag/$($c.tag)"
      releasedAt = $c.pub.ToUniversalTime().ToString('o'); releaseDate = $c.pub.ToString('yyyy-MM-dd')
      notes = $(if ($c.body.Trim()) { $c.body.Trim().Substring(0, [Math]::Min(6000, $c.body.Trim().Length)) } else { "No changelog in release $($c.tag) on $($c.repo)." }) }
  }
  foreach ($id in $extraIds) {
    $e = $extras[$id]
    if (-not $byId[$id]) { $byId[$id] = @{ id = $id; files = @() } }
    $dir = Join-Path $work ($id + '-extras'); New-Item -ItemType Directory -Force $dir | Out-Null
    $pats = @($e.shots) + @($e.icon, $e.listing | Where-Object { $_ })
    foreach ($pt in $pats) { gh release download $e.tag --repo $e.repo --pattern $pt --dir $dir --clobber | Out-Null }
    $u = $byId[$id]
    $L = $null; if ($e.listing -and (Test-Path (Join-Path $dir $e.listing))) { $L = Get-Content (Join-Path $dir $e.listing) -Raw | ConvertFrom-Json }
    if ($L) {
      foreach ($f in 'name','purpose','description') { if ($L.$f) { $u[$f] = [string]$L.$f } }
      if ($L.bullets) { $u.bullets = @($L.bullets) }
      if ($L.notes) { foreach ($f in $u.files) { $f.notes = [string]$L.notes } }
    }
    $shotList = @()
    if ($L -and $L.shots) { foreach ($s in $L.shots) { $sp = Join-Path $dir $s.file; if (Test-Path $sp) { $shotList += @{ path = $sp; caption = [string]$s.caption } } } }
    else {
      foreach ($s in $e.shots) {
        $sp = Join-Path $dir $s; if (-not (Test-Path $sp)) { continue }
        $cap = ([IO.Path]::GetFileNameWithoutExtension($s) -replace '^.*?-shot-?\d*-?', '') -replace '[-_]+', ' '
        $shotList += @{ path = $sp; caption = (Get-Culture).TextInfo.ToTitleCase($cap.Trim()) }
      }
    }
    if ($shotList.Count) { $u.shots = $shotList }
    $ic = $(if ($L -and $L.icon) { $L.icon } else { $e.icon })
    if ($ic -and (Test-Path (Join-Path $dir $ic))) { $u.icon = (Join-Path $dir $ic) }
  }

  $updates = @($byId.Values | Where-Object { $_.files.Count -or $_.shots -or $_.icon -or $_.purpose -or $_.bullets })
  $msg = 'Vault: farm update (' + (($updates | ForEach-Object { $_.id }) -join ', ') + ')'
  $n = Invoke-PlsPublish -Updates $updates -RepoPath $RepoPath -MK $mk -Message $msg -Log { param($m) Log $m } `
        -Watcher ([pscustomobject]@{ ok = (Get-Date).ToString('o'); error = '' }) -DryRun:$DryRun
  Log ($(if ($DryRun) { "dry run: would publish $n change(s) - nothing was pushed" } else { "published $n change(s)" }))
  # tell the ticket watcher which notes went out (for "Fixes T-...")
  $fixedPath = $(if ($env:PLS_FIXED_REFS) { $env:PLS_FIXED_REFS } else { 'C:\PulseLabs\fixed-refs.json' })
  if (-not $DryRun) {
    $refs = @($todo | Where-Object { -not $_.archivedOnly } | ForEach-Object { [pscustomobject]@{ product = $_.id; version = $_.version; notes = $_.body } })
    if ($refs.Count) { $old = @(); if (Test-Path $fixedPath) { $old = @(Get-Content $fixedPath -Raw | ConvertFrom-Json) }
      [IO.File]::WriteAllText($fixedPath, (@($old) + $refs | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding $false)) }
  }
  foreach ($kv in $newState.GetEnumerator()) { $state[$kv.Key] = $kv.Value }
  if (-not $DryRun) { $state | ConvertTo-Json | Set-Content $StatePath }
}
catch {
  $err = $_.Exception.Message
  Log "ERROR: $err"
  # Put the problem on the site itself (red bar after sign-in), once per distinct error.
  try {
    if ($mk -and $man -and (-not $man.watcher -or $man.watcher.error -ne $err)) {
      $null = Invoke-PlsPublish -Updates @() -RepoPath $RepoPath -MK $mk -Message 'Vault: watcher problem' -DryRun:$DryRun `
        -Watcher ([pscustomobject]@{ ok = $(if ($man.watcher) { $man.watcher.ok } else { '' }); error = $err; at = (Get-Date).ToString('o') })
    }
  } catch { Log "could not post the error to the site: $($_.Exception.Message)" }
}
finally { $mutex.ReleaseMutex(); Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }
