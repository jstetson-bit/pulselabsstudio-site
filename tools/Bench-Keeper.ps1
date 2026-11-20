# Pulse Bench Keeper v2 (HQ, 2026-11-20). Runs every minute (scheduled task "Pulse Bench Keeper"). No AI, no tokens.
# v1 only restarted the bench when the emulator wasn't running. v2 also restarts it when it is running but FROZEN:
# it asks the emulator "are you booted?" (adb, 15 s limit); 5 failed checks in a row (about 5 minutes) = frozen -> kill + restart.
# A freshly started bench gets 6 minutes to boot before it is checked. Pause file: <kit>\keeper-pause.
$kit = @('C:\PulseBench', "$env:LOCALAPPDATA\PulseBench") | Where-Object { Test-Path "$_\Start-Bench.ps1" } | Select-Object -First 1
if (-not $kit -or (Test-Path "$kit\keeper-pause")) { exit }
$log = "$kit\keeper.log"; $strikes = "$kit\keeper-strikes.txt"; $started = "$kit\keeper-started.txt"
function Say($m) { "$(Get-Date -f s) $m" | Add-Content $log }
function StartBench { Say 'starting bench'; Set-Content $started (Get-Date -f o); Remove-Item $strikes -ErrorAction SilentlyContinue
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$kit\Start-Bench.ps1" *>> $log }
$emu = Get-Process -Name 'qemu-system-*','emulator' -ErrorAction SilentlyContinue
if (-not $emu) { Say 'bench was down'; StartBench; exit }
if (Test-Path $started) { $t = [datetime](Get-Content $started -Raw).Trim(); if (((Get-Date) - $t).TotalMinutes -lt 6) { exit } }
$sdk = @($env:ANDROID_HOME, [Environment]::GetEnvironmentVariable('ANDROID_HOME','Machine'), [Environment]::GetEnvironmentVariable('ANDROID_HOME','User'), 'C:\Android\Sdk', "$env:LOCALAPPDATA\Android\Sdk") | Where-Object { $_ -and (Test-Path "$_\platform-tools\adb.exe") } | Select-Object -First 1
if (-not $sdk) { exit }
$out = "$env:TEMP\keeper-adb.txt"
$p = Start-Process "$sdk\platform-tools\adb.exe" -ArgumentList 'shell','getprop','sys.boot_completed' -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError "$out.err"
$ok = $false
if ($p.WaitForExit(15000)) { $ok = ((Get-Content $out -Raw) -match '1') } else { try { $p.Kill() } catch {} }
if ($ok) { Remove-Item $strikes -ErrorAction SilentlyContinue; exit }
$n = 1; if (Test-Path $strikes) { $n = [int](Get-Content $strikes -Raw) + 1 }; Set-Content $strikes $n
Say "bench not answering ($n/5)"
if ($n -ge 5) { Say 'bench FROZEN - killing and restarting'; $emu | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep 5; StartBench }
