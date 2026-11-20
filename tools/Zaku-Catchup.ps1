# ZakuII catch-up (HQ, 2026-11-19): everything Snow White / RT0 / E1 got tonight, on ZakuII.
# Run in an ADMIN PowerShell window ON ZAKUII. Safe to re-run. Nothing is deleted (old poll kept as a dated backup).
#  1. Git/Java/Android check + bench kit (SDK 37) + HQ Feed heartbeat + guest-list door   (same as Farm-Bootstrap.ps1)
#  2. The new shared seat poll (one job at a time, honors "Seat: ZakuII", checks in on the guest list)
#  3. Pulse Doorbell (seat claude-zaku)        4. Pulse Bench Keeper (restarts the bench emulator when it's down)
$ErrorActionPreference = 'Continue'
$out = @("ZakuII catch-up $(Get-Date -f s) on $env:COMPUTERNAME")
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $env:Path += ';C:\Program Files\Git\cmd' }
$d = "$env:TEMP\farm-$(Get-Date -f yyyyMMddHHmmss)"
git clone -q https://github.com/jstetson-bit/gundam-farm-note20 $d
Set-Location $d

# 1. bench kit + HQ Feed + door
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\farm-seat\Install-BenchKit.ps1 -Repo $d
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\hq-feed\Install-HqFeed.ps1 -Machine ZakuII
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\farm-queue\Install-FarmDoor.ps1
$out += "1. bench kit + HQ Feed + door: ran"

# 2. new seat poll
$t = Get-ScheduledTask -TaskName 'SeatMailboxPoll' -ErrorAction SilentlyContinue
if (-not $t) { $out += "2. NO SeatMailboxPoll task on this machine - tell HQ" } else {
  $a = $t.Actions[0]; $args0 = "$($a.Arguments)"
  $file = if ($args0 -match '-File\s+"?([^"]+?\.ps1)"?(\s|$)') { $Matches[1] } else { Join-Path $env:USERPROFILE 'seat-poll.ps1' }
  $repo = $null
  if (Test-Path $file) {
    Copy-Item $file "$file.backup-$(Get-Date -f yyyyMMdd-HHmm)"
    $old = Get-Content $file -Raw
    if ($old -match "([A-Za-z]:\\[^'`"\r\n]*?gundam-farm-note20)") { $repo = $Matches[1] }
  }
  if (-not $repo -or -not (Test-Path $repo)) { $repo = @("$env:USERPROFILE\gundam-farm-note20", 'C:\Users\jstet\gundam-farm-note20') | Where-Object { Test-Path $_ } | Select-Object -First 1 }
  Copy-Item "$d\scripts\farm-seat\seat-poll.ps1" $file -Force
  $new = ($args0 -replace '\s-(Seat|ClaimTag|Repo)\s+\S+', '').Trim() + " -Seat ZakuII -ClaimTag zaku" + $(if ($repo) { " -Repo `"$repo`"" } else { '' })
  $na = @{ Execute = $a.Execute; Argument = $new }; if ($a.WorkingDirectory) { $na.WorkingDirectory = $a.WorkingDirectory }
  Set-ScheduledTask -TaskName 'SeatMailboxPoll' -Action (New-ScheduledTaskAction @na) | Out-Null
  $out += "2. new poll -> $file ; args: $new"
}

# 3. doorbell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doorbell\Install-Doorbell.ps1 -Seat claude-zaku
$out += "3. doorbell: ran"

# 4. bench keeper
$kit = @('C:\PulseBench', "$env:LOCALAPPDATA\PulseBench") | Where-Object { Test-Path "$_\Start-Bench.ps1" } | Select-Object -First 1
if ($kit) {
  Set-Content -Path "$kit\Bench-Keeper.ps1" -Encoding UTF8 -Value @"
if (Test-Path '$kit\keeper-pause') { exit }
if (-not (Get-Process -Name 'qemu-system-*','emulator' -ErrorAction SilentlyContinue)) {
  "`$(Get-Date -f s) bench was down, starting it" | Add-Content '$kit\keeper.log'
  & powershell -NoProfile -ExecutionPolicy Bypass -File '$kit\Start-Bench.ps1' *>> '$kit\keeper.log'
}
"@
  $act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$kit\Bench-Keeper.ps1`""
  $trg = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
  $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
  $pr = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName 'Pulse Bench Keeper' -Action $act -Trigger $trg -Settings $set -Principal $pr -Force | Out-Null
  $out += "4. bench keeper: installed ($kit)"
} else { $out += "4. bench keeper: Start-Bench.ps1 not found - skipped" }

git pull -q; $out | Set-Content -Encoding UTF8 "docs\farm\catchup-ZakuII.txt"; Copy-Item "$((@('C:\PulseBench',"$env:LOCALAPPDATA\PulseBench") | Where-Object { Test-Path "$_\kit.json" } | Select-Object -First 1))\kit.json" "docs\farm\bench-kit-$env:COMPUTERNAME.json" -Force -ErrorAction SilentlyContinue
git add docs/farm; git commit -qm "farm: ZakuII catch-up (poll, doorbell, keeper, heartbeat)"; git push -q
$out
Get-ScheduledTask -TaskName 'Pulse*','Seat*' | Format-Table TaskName,State
