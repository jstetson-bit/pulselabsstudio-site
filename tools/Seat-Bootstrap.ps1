# Pulse farm SEAT bootstrap (HQ, 2026-11-20): turns a tools-ready farm machine into a full seat that takes mailbox orders,
# exactly like Snow White and ZakuII. Run in an ADMIN PowerShell window. Safe to re-run; nothing is deleted.
# Needs Farm-Bootstrap.ps1 done first (Git, Java 17, Android SDK 37, bench kit, heartbeat, door).
# Installs: Claude Code, GitHub CLI, Gradle 8.7, the repos the seat works in, the shared seat poll (every minute,
# one job at a time, any order not pinned to another seat), the doorbell and Bench Keeper v2.
# Ends with TWO one-time sign-ins you do yourself: Claude Code and GitHub CLI.
$ErrorActionPreference = 'Continue'
$U = $env:USERPROFILE
$map = @{ 'RTZERO1' = 'RT0'; 'SYSTEMZER0E1' = 'E1'; 'ZEROGUNDAM01' = 'Gundam' }
$seat = if ($map.ContainsKey($env:COMPUTERNAME)) { $map[$env:COMPUTERNAME] } else { $env:COMPUTERNAME }
$tag = $seat.ToLower()
$out = @("Seat bootstrap $(Get-Date -f s) on $env:COMPUTERNAME as seat '$seat'")
foreach ($p in 'C:\Program Files\Git\cmd', 'C:\Program Files\GitHub CLI') { if (Test-Path $p) { $env:Path += ";$p" } }
function W($id) { winget install -e --id $id --silent --accept-package-agreements --accept-source-agreements | Out-Null }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { W Git.Git; $env:Path += ';C:\Program Files\Git\cmd' }
$claude = Join-Path $U 'AppData\Local\Microsoft\WinGet\Links\claude.exe'
if (-not (Test-Path $claude)) { W Anthropic.ClaudeCode }
$out += "Claude Code: $(if (Test-Path $claude) { 'installed' } else { 'NOT FOUND after install - tell HQ' })"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { W GitHub.cli; $env:Path += ';C:\Program Files\GitHub CLI' }
$out += "GitHub CLI: $(if (Get-Command gh -ErrorAction SilentlyContinue) { 'installed' } else { 'NOT FOUND' })"
$gradle = Join-Path $U 'tools\gradle-8.7'
if (-not (Test-Path "$gradle\bin\gradle.bat")) {
  New-Item -ItemType Directory -Force (Join-Path $U 'tools') | Out-Null
  Invoke-WebRequest -UseBasicParsing 'https://services.gradle.org/distributions/gradle-8.7-bin.zip' -OutFile "$env:TEMP\gradle-8.7.zip"
  Expand-Archive "$env:TEMP\gradle-8.7.zip" -DestinationPath (Join-Path $U 'tools') -Force
}
$out += "Gradle 8.7: $(Test-Path "$gradle\bin\gradle.bat")"
$repo = Join-Path $U 'gundam-farm-note20'
if (-not (Test-Path "$repo\.git")) { git clone -q https://github.com/jstetson-bit/gundam-farm-note20 $repo } else { git -C $repo fetch -q origin }
$kb = Join-Path $U 'mecha_keyboards'
if (-not (Test-Path "$kb\.git")) { git clone -q https://github.com/jstetson-bit/keyboard-studio $kb }
New-Item -ItemType Directory -Force (Join-Path $U 'Downloads') | Out-Null
$out += "repos: gundam-farm-note20 $(Test-Path "$repo\.git"), mecha_keyboards $(Test-Path "$kb\.git")"
Copy-Item "$repo\scripts\farm-seat\seat-poll.ps1" (Join-Path $U 'seat-poll.ps1') -Force
$set = Join-Path $U 'seat-poll-settings.json'
if (-not (Test-Path $set)) {
  '{ "permissions": { "allow": [ "Bash(git:*)", "Bash(gh:*)", "Bash(gradle:*)", "Bash(./gradlew:*)", "Bash(pulse-bench:*)", "Bash(adb:*)", "Bash(powershell:*)", "Bash(pwsh:*)" ] } }' | Set-Content -Encoding UTF8 $set
}
$done = Join-Path $U 'seat-done.txt'; if (-not (Test-Path $done)) { New-Item -ItemType File $done | Out-Null }
$args0 = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$U\seat-poll.ps1`" -Seat $seat -ClaimTag $tag -Repo `"$repo`""
$act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $args0 -WorkingDirectory $U
$trg = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 1)
$st = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 6)
$pr = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'SeatMailboxPoll' -Action $act -Trigger $trg -Settings $st -Principal $pr -Force | Out-Null
$out += "seat poll: every minute as seat '$seat' (claim tag $tag)"
Set-Location $repo
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doorbell\Install-Doorbell.ps1 -Seat "claude-$tag"
$out += "doorbell: claude-$tag"
$kit = @('C:\PulseBench', "$env:LOCALAPPDATA\PulseBench") | Where-Object { Test-Path "$_\Start-Bench.ps1" } | Select-Object -First 1
if ($kit) {
  Invoke-RestMethod 'https://raw.githubusercontent.com/jstetson-bit/pulselabsstudio-site/main/tools/Bench-Keeper.ps1' -OutFile "$kit\Bench-Keeper.ps1"
  $ka = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$kit\Bench-Keeper.ps1`""
  $kt = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
  $ks = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
  Register-ScheduledTask -TaskName 'Pulse Bench Keeper' -Action $ka -Trigger $kt -Settings $ks -Principal $pr -Force | Out-Null
  $out += "bench keeper v2: installed"
}
git pull -q; $out | Set-Content -Encoding UTF8 "docs\farm\seat-$seat.txt"; git add "docs/farm/seat-$seat.txt"; git commit -qm "farm: $seat is a seat now"; git push -q
$out
''
'LAST STEP (once on this machine):'
'  1. Type:  claude        -> sign in in the browser it opens, then type /exit'
'  2. Type:  gh auth login -> GitHub.com, HTTPS, log in with a web browser'
"After that, $seat takes orders by itself every minute."
