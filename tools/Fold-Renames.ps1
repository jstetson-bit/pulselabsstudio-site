<#
  Fold-Renames.ps1 — merge cards left behind by a product rename into the current card.

  tools\renames.json maps an old file-name prefix to the new one ({ "PulseAIDA64": "Pulse64" }).
  The watcher applies it to new builds; this script fixes the cards the vault already has:
  every build listed under the old name moves into the new product's history (newest first, per shelf),
  and the old card leaves the list. No file is deleted: each moved build keeps its sealed file and its
  link to the farm Release. If the new card has the same shelf + version, the new card's entry wins.

    .\Fold-Renames.ps1            # dry run (default): prints what would change, writes and pushes nothing
    .\Fold-Renames.ps1 -Apply     # writes the list and pushes it (the site updates in about 2 minutes)
#>
[CmdletBinding()]
param([string]$KeyPath, [string]$RepoPath, [switch]$Apply)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
$mk = Get-PlsMasterKey $KeyPath
$map = Get-PlsRenames
if (-not $map.Count) { Write-Host 'renames.json has no renames; nothing to do.'; return }

Push-Location $RepoPath
try {
  if ($Apply) { git pull --ff-only -q 2>$null | Out-Null }
  $vault = Read-PlsVault $RepoPath
  $man = Get-PlsManifest $vault $mk
  $list = New-Object Collections.ArrayList; foreach ($x in @($man.products)) { if ($x) { [void]$list.Add($x) } }
  $changes = 0
  foreach ($oldId in @($map.Keys)) {
    $old = $list | Where-Object { $_.id -eq $oldId } | Select-Object -First 1
    if (-not $old) { Write-Host "$oldId : no card under this id (already folded)"; continue }
    $raw = Resolve-PlsRename $oldId
    $newId = ConvertTo-PlsId $raw
    $new = $list | Where-Object { $_.id -eq $newId } | Select-Object -First 1
    $oldDl = @($old.downloads | Where-Object { $_ })
    if (-not $new) {
      Write-Host "$oldId -> $newId : no '$newId' card yet; the old card is renamed in place ($($oldDl.Count) build(s) kept)"
      $old.id = $newId; $old.name = (($raw -replace '[-_]+', ' ') -creplace '(?<=[a-z])(?=[A-Z])', ' ').Trim()
      $changes++; continue
    }
    $newDl = @($new.downloads | Where-Object { $_ })
    $moved = @(); $skipped = @()
    foreach ($d in $oldDl) {
      if ($newDl | Where-Object { $_.platform -eq $d.platform -and $_.version -eq $d.version }) { $skipped += $d } else { $moved += $d }
    }
    $new.downloads = @(@($newDl) + @($moved) | Sort-Object @{ e = { [string]$_.platform } }, @{ e = { [string]$_.releasedAt }; Descending = $true })
    foreach ($fld in 'purpose', 'description') { if (-not $new.$fld -and $old.$fld) { $new.$fld = $old.$fld } }
    if (-not @($new.bullets).Count -and @($old.bullets).Count) { $new.bullets = @($old.bullets) }
    [void]$list.Remove($old)
    $changes++
    Write-Host ("{0} ('{1}') -> {2} ('{3}'): move {4} build(s) into its history, {5} already there, then remove the '{1}' card" -f $oldId, $old.name, $newId, $new.name, $moved.Count, $skipped.Count)
    foreach ($d in $moved) { Write-Host ("    move  {0,-8} {1,-14} {2}{3}" -f $d.platform, $d.version, $d.file, $(if ($d.b) { '' } else { '  (history only)' })) }
    foreach ($d in $skipped) { Write-Host ("    same  {0,-8} {1,-14} {2}  (the {3} entry is kept)" -f $d.platform, $d.version, $d.file, $newId) }
  }
  if (-not $changes) { Write-Host 'Nothing to fold.'; return }
  if (-not $Apply) { Write-Host "DRY RUN: $changes card(s) would change. Nothing was written or pushed. Run with -Apply to publish."; return }
  $man.products = @($list | Sort-Object name)
  $man.updated = (Get-Date).ToString('yyyy-MM-dd')
  Set-PlsManifest $vault $mk $man
  Write-PlsVault $RepoPath $vault
  git add vault/vault.json | Out-Null
  git commit -q -m 'Vault: fold renamed products (renames.json)' | Out-Null
  git push -q 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'git push failed; run again.' }
  Write-Host "Published: $changes card(s) folded. Live in about 2 minutes."
}
finally { Pop-Location }
