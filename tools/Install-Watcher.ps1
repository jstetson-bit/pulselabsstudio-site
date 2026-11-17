<#
  Install-Watcher.ps1 — one-time setup on a farm machine (admin PowerShell).
  Registers the "Pulse Labs Site Watcher" scheduled task: every 2 minutes, hidden, as the signed-in user
  (that user's gh sign-in is what it uses). Safe to run again; it replaces the old task.
  Remove it:  Unregister-ScheduledTask -TaskName 'Pulse Labs Site Watcher' -Confirm:$false
#>
param([int]$Minutes = 2)
$ErrorActionPreference = 'Stop'
$vbs = Join-Path $PSScriptRoot 'run-hidden.vbs'
$action  = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$set     = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
$who     = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Pulse Labs Site Watcher' -Action $action -Trigger $trigger -Settings $set -Principal $who -Force | Out-Null
Write-Host "Watcher installed: every $Minutes minutes. Log: C:\PulseLabs\logs\watcher.log" -ForegroundColor Green
