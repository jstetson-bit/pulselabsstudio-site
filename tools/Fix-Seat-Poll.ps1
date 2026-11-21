# Fix-Seat-Poll.ps1 (HQ, 2026-11-21): makes a farm machine take mailbox orders ONE AT A TIME and honor "Seat:" pins.
# Run in an ADMIN PowerShell on the machine (ZakuII first):
#   irm https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/main/tools/Fix-Seat-Poll.ps1 | iex
# What it does, safe to re-run, nothing deleted:
#   1. Finds every scheduled task that runs a seat poll; DISABLES (does not delete) any that isn't the shared SeatMailboxPoll.
#   2. Re-installs the shared poll from the farm repo (scripts\farm-seat\Install-SeatPoll.ps1): one order per run, pins honored.
#   3. Writes a report to docs/farm/seat-poll-fix-<MACHINE>.txt on a branch and pushes it, so HQ can read it.
$ErrorActionPreference = 'Continue'
foreach ($p in 'C:\Program Files\Git\cmd', 'C:\Program Files\GitHub CLI') { if (Test-Path $p) { $env:Path += ";$p" } }
$out = @("Seat poll fix $(Get-Date -f s) on $env:COMPUTERNAME")
$repo = @("$env:USERPROFILE\gundam-farm-note20", 'C:\Users\jstet\gundam-farm-note20') | Where-Object { Test-Path "$_\.git" } | Select-Object -First 1
if (-not $repo) { Write-Host 'Farm repo not found in your user folder. Tell HQ.' -ForegroundColor Yellow; return }
$out += "Repo: $repo"

$polls = Get-ScheduledTask | Where-Object { ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -match 'seat-poll|SeatPoll|PulseSeat' }
foreach ($t in $polls) {
  $act = ($t.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join ' | '
  $out += "Found task: '$($t.TaskName)' state=$($t.State) action=$act"
  if ($t.TaskName -ne 'SeatMailboxPoll' -and $t.State -ne 'Disabled') {
    Disable-ScheduledTask -TaskName $t.TaskName -TaskPath $t.TaskPath | Out-Null
    $out += "  -> disabled (kept, not deleted). Re-enable: Enable-ScheduledTask -TaskName '$($t.TaskName)'"
  }
}
if (-not $polls) { $out += 'No poll task found before the install.' }

Push-Location $repo
git pull -q 2>$null
$inst = Join-Path $repo 'scripts\farm-seat\Install-SeatPoll.ps1'
if (Test-Path $inst) {
  $res = powershell -NoProfile -ExecutionPolicy Bypass -File $inst -Repo $repo 2>&1 | Out-String
  $out += '--- Install-SeatPoll output ---'; $out += $res.Trim()
} else { $out += "MISSING: $inst" }
$after = Get-ScheduledTask | Where-Object { ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -match 'seat-poll|SeatPoll|PulseSeat' } |
  ForEach-Object { "$($_.TaskName) = $($_.State)" }
$out += "After: " + ($after -join '; ')

$br = "seat/seat-poll-fix-$($env:COMPUTERNAME.ToLower())"
git fetch -q origin main 2>$null; git checkout -q -B $br origin/main 2>$null
New-Item -ItemType Directory -Force docs\farm | Out-Null
$out | Set-Content -Encoding UTF8 "docs\farm\seat-poll-fix-$env:COMPUTERNAME.txt"
git add "docs/farm/seat-poll-fix-$env:COMPUTERNAME.txt"; git commit -qm "farm: seat poll fix report $env:COMPUTERNAME" 2>$null; git push -q -u origin $br 2>$null
git checkout -q main 2>$null
Pop-Location
$out | ForEach-Object { Write-Host $_ }
Write-Host "Done. Report pushed to branch $br" -ForegroundColor Green
