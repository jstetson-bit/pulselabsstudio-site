<#
.SYNOPSIS
  Trim the downloads shelf to the newest build per app and platform (owner, 2026-11-24: "kill all the previous
  versions except for whatever's current, because it's having problems downloading").

  Why: the site's Pages deploy packs the pages AND every file on the vault release into one upload. At 3.2 GB
  (295 files) GitHub kept failing to publish it. Older builds are not lost: each stays in the history with its
  changelog and a link to its farm GitHub Release, exactly like the watcher's normal "archived" entries.

  Run on the machine that holds the vault key (Snow White), in PowerShell:
      powershell -NoProfile -ExecutionPolicy Bypass -File <site>\tools\Trim-Vault.ps1            # trims
      powershell -NoProfile -ExecutionPolicy Bypass -File <site>\tools\Trim-Vault.ps1 -DryRun    # shows only
  Also removes encrypted files on the vault release that nothing on the list points to any more.
  -Keep N keeps the newest N per shelf (default 1).
#>
param([int]$Keep = 1, [string]$KeyPath, [string]$RepoPath, [string]$Repo = 'jstetson-bit/pulselabsstudio-site', [switch]$DryRun)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
if (-not (Test-Path $RepoPath)) { git clone -q "https://github.com/$Repo" $RepoPath }
$mk = Get-PlsMasterKey $KeyPath
function Say($m, $c = 'Cyan') { Write-Host "[trim] $m" -ForegroundColor $c }

Push-Location $RepoPath
try {
  git pull --ff-only -q 2>$null | Out-Null
  $vault = Read-PlsVault $RepoPath
  $man = Get-PlsManifest $vault $mk
  $retire = New-Object Collections.ArrayList
  $keepBlobs = New-Object 'Collections.Generic.HashSet[string]'
  foreach ($p in @($man.products | Where-Object { $_ })) {
    if ($p.icon -and $p.icon.b) { [void]$keepBlobs.Add([string]$p.icon.b) }
    foreach ($s in @($p.shots | Where-Object { $_ })) { if ($s.b) { [void]$keepBlobs.Add([string]$s.b) } }
    $all = @($p.downloads | Where-Object { $_ } | Sort-Object { [string]$_.releasedAt } -Descending)
    foreach ($pl in @($all | ForEach-Object { $_.platform } | Select-Object -Unique)) {
      $i = 0
      foreach ($d in @($all | Where-Object { $_.platform -eq $pl })) {
        if (-not $d.b) { continue }          # already history only
        $i++
        if ($i -le $Keep) { [void]$keepBlobs.Add([string]$d.b); continue }
        [void]$retire.Add([string]$d.b)
        Say ("{0} {1} {2}: history only now (file leaves the site, farm Release link stays)" -f $p.name, $pl, $d.version) Gray
        $d.b = $null; $d.k = $null
        if ($d.PSObject.Properties['archived']) { $d.archived = $true } else { $d | Add-Member -NotePropertyName archived -NotePropertyValue $true }
      }
    }
  }
  # files on the release that the list no longer points to at all
  $assets = @(gh api --paginate "repos/$Repo/releases/tags/vault" -q '.assets[] | "\(.name) \(.size)"' | ForEach-Object { $n, $s = $_ -split ' '; [pscustomobject]@{ name = $n; size = [long]$s } })
  $orphans = @($assets | Where-Object { -not $keepBlobs.Contains($_.name) -and -not $retire.Contains($_.name) })
  foreach ($o in $orphans) { [void]$retire.Add($o.name) }
  $sizeOf = @{}; foreach ($a in $assets) { $sizeOf[$a.name] = $a.size }
  $freed = ($retire | ForEach-Object { $sizeOf[$_] } | Measure-Object -Sum).Sum
  $before = ($assets | Measure-Object size -Sum).Sum
  Say ("{0} files on the shelf, {1:N0} MB. Keeping {2} files; removing {3} ({4} no longer listed), {5:N0} MB." -f $assets.Count, ($before / 1MB), $keepBlobs.Count, $retire.Count, $orphans.Count, ($freed / 1MB))
  if ($DryRun) { Say 'DRY RUN: nothing changed.' Yellow; return }
  if ($retire.Count -eq 0) { Say 'Nothing to trim.' Green; return }

  # the list first, so the page never points at a file that is gone
  $man.updated = (Get-Date).ToString('yyyy-MM-dd')
  Set-PlsManifest $vault $mk $man
  Write-PlsVault $RepoPath $vault
  git add vault/vault.json | Out-Null
  git commit -q -m "Vault: trim to the newest $Keep build(s) per shelf (owner, 2026-11-24)" | Out-Null
  git push -q 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { git pull --rebase -q 2>$null | Out-Null; git push -q 2>$null | Out-Null }
  if ($LASTEXITCODE -ne 0) { throw 'git push of the list failed; no files were removed. Run it again.' }
  $n = 0
  foreach ($b in $retire) { gh release delete-asset vault $b --repo $Repo -y *> $null; if ($LASTEXITCODE -eq 0) { $n++ } }
  $after = (@(gh api --paginate "repos/$Repo/releases/tags/vault" -q '.assets[].size') | Measure-Object -Sum).Sum
  Say ("Removed {0} files. The shelf is now {1:N0} MB. The site republishes in a few minutes." -f $n, ($after / 1MB)) Green
}
finally { Pop-Location }
