<#
  Watch-Status.ps1 — "Where it stands" for every product on the private downloads page. Token-free.
  Runs after the build and ticket watchers (run-hidden.vbs) but only does work every 30 minutes.

  Reads the farm's project directory (projects/README.md on gundam-farm-note20 main: folder, branch, state) and, for
  each product on the site, records: the state line, the last commit on its branch (when + what), the top of its
  STATUS.md, and the branch. Separate-repo projects (keyboard-studio) use that repo's default branch and docs/.
#>
[CmdletBinding()]
param(
  [string]$FarmRepo = 'jstetson-bit/gundam-farm-note20',
  [string]$Owner = 'jstetson-bit',
  [int]$EveryMinutes = 30,
  [string]$StatePath = $(if ($env:PLS_STATUS_STATE) { $env:PLS_STATUS_STATE } else { 'C:\PulseLabs\status-state.txt' }),
  [string]$LogPath = $(if ($env:PLS_WATCH_LOG) { $env:PLS_WATCH_LOG } else { 'C:\PulseLabs\logs\watcher.log' }),
  [string]$KeyPath, [string]$RepoPath, [switch]$Force, [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
function Log($m) { $l = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '  status: ' + $m; Add-Content -Path $LogPath -Value $l; Write-Host $l }
function Norm($s) { ([string]$s).ToLowerInvariant() -replace '[^a-z0-9]', '' }
function Plain($md) { (($md -replace '\*\*|`|__', '') -replace '\[([^\]]+)\]\([^)]+\)', '$1').Trim() }
function Gh-Text($path) {   # file text from GitHub, or $null
  $ErrorActionPreference = 'Continue'   # Windows PowerShell 5.1: a 404 on stderr must not throw; the exit code decides
  $b = gh api $path --jq .content 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $b) { return $null }
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((($b -join '') -replace '\s', '')))
}
New-Item -ItemType Directory -Force (Split-Path $LogPath) | Out-Null
if (-not $Force -and (Test-Path $StatePath) -and ((Get-Date) - (Get-Item $StatePath).LastWriteTime).TotalMinutes -lt $EveryMinutes) { return }
try {
  $mk = Get-PlsMasterKey $KeyPath
  Push-Location $RepoPath; try { git pull --ff-only -q 2>$null | Out-Null } finally { Pop-Location }
  $vault = Read-PlsVault $RepoPath; $man = Get-PlsManifest $vault $mk

  # 1. the farm's project directory
  $dir = Gh-Text "repos/$FarmRepo/contents/projects/README.md"
  if (-not $dir) { throw "can't read projects/README.md on $FarmRepo" }
  $rows = @()
  foreach ($line in ($dir -split "`n")) {
    if ($line -notmatch '^\|' -or $line -match '^\|\s*-') { continue }
    $cells = @($line.Trim().Trim('|') -split '\|' | ForEach-Object { $_.Trim() })
    if ($cells.Count -lt 3) { continue }
    $folder = $(if ($cells[0] -match '`([^`]+)/`') { $Matches[1] } else { '' })
    $name = $(if ($line -match '\*\*([^*]+)\*\*') { ($Matches[1] -split ' — | - ')[0].Trim() } else { Plain $cells[1] })
    $branch = $(if ($line -match 'tree/([A-Za-z0-9._/-]+)\)') { $Matches[1] } elseif ($line -match 'branch \[`([^`]+)`\]') { $Matches[1] } else { '' })
    $repo = $FarmRepo
    if ($line -match 'Separate repo \[`([^`]+)`\]') { $repo = "$Owner/$($Matches[1])"; $branch = '' }
    $rows += [pscustomobject]@{ folder = $folder; name = $name; branch = $branch; repo = $repo; state = Plain $cells[-1]; keys = @((Norm $folder), (Norm $name), (Norm ($cells[0]))) }
  }

  # 2. each product on the site
  $changed = @()
  foreach ($p in @($man.products)) {
    $k1 = Norm $p.id; $k2 = Norm $p.name
    $row = $rows | Where-Object { ($_.keys -contains $k1) -or ($_.keys -contains $k2) -or ($k1 -and ($_.keys | Where-Object { $_ -and $_.Length -gt 4 -and ($k1.StartsWith($_) -or $_.StartsWith($k1)) })) } | Select-Object -First 1
    if (-not $row) { continue }
    $branch = $row.branch
    if (-not $branch) { $branch = & { $ErrorActionPreference = 'Continue'; gh api "repos/$($row.repo)" --jq .default_branch 2>$null }; if (-not $branch) { $branch = 'main' } }
    $c = & { $ErrorActionPreference = 'Continue'; gh api "repos/$($row.repo)/commits?sha=$branch&per_page=1" --jq '.[0] | [.sha, .commit.committer.date, .commit.message] | @tsv' 2>$null }   # no inner double quotes: Windows PowerShell 5.1 strips them from native args
    $sha, $when, $msg = $(if ($c) { ($c -split "`t") } else { @('', '', '') })
    $msg = ([string]$msg -split '\\n')[0]   # @tsv writes newlines as a literal \n; keep the first line
    $st = $null
    foreach ($path in @("projects/$($row.folder)/STATUS.md", 'docs/STATUS.md', 'STATUS.md', 'docs/CHANGELOG.md')) {
      if ($path -like 'projects//*') { continue }
      $st = Gh-Text "repos/$($row.repo)/contents/$($path)?ref=$branch"; if ($st) { $stFrom = $path; break }
    }
    $summary = ''
    if ($st) {
      $keep = @()
      foreach ($l in ($st -split "`n")) {
        $t = $l.Trim()
        if (-not $t -or $t -match '^#\s') { continue }                       # blank lines and the page title
        if ($t -match '^#{2,}\s*(.*)$') { if ($keep.Count -ge 2) { break }; $keep += ('[' + (Plain $Matches[1]) + ']'); continue }
        $keep += (Plain $t); if ($keep.Count -ge 12) { break }
      }
      $summary = ($keep -join "`n"); if ($summary.Length -gt 1400) { $summary = $summary.Substring(0, 1400) + '…' }
    }
    $new = [pscustomobject]@{ repo = $row.repo; branch = $branch; folder = $row.folder; state = $row.state; lastCommitAt = $when; lastCommit = $msg
      commitUrl = $(if ($sha) { "https://github.com/$($row.repo)/commit/$sha" } else { '' }); branchUrl = "https://github.com/$($row.repo)/tree/$branch"
      summary = $summary; summaryFrom = $stFrom; checkedAt = (Get-Date).ToUniversalTime().ToString('o') }
    $old = $p.status
    if (-not $old -or $old.lastCommitAt -ne $new.lastCommitAt -or $old.state -ne $new.state -or $old.summary -ne $new.summary) { $changed += @{ id = $p.id; status = $new } }
  }
  if ($changed.Count) {
    $n = Invoke-PlsPublish -Updates $changed -RepoPath $RepoPath -MK $mk -Message ('Vault: where it stands (' + (($changed | ForEach-Object { $_.id }) -join ', ') + ')') -DryRun:$DryRun -Log { param($m) Log $m }
    Log "updated $($changed.Count) product(s)"
  }
  if (-not $DryRun) { Set-Content $StatePath (Get-Date).ToString('o') }
}
catch { Log "ERROR: $($_.Exception.Message)" }
