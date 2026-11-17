<#
  Set-TicketKey.ps1 — switch on the "Report a problem" form. One time, admin PowerShell.
  The key is a GitHub fine-grained token that can ONLY read/write the private tickets repo (Contents: read and write).
  It is stored INSIDE the encrypted product list, so only signed-in people's browsers ever see it.
    .\Set-TicketKey.ps1                 (asks for the token)
    .\Set-TicketKey.ps1 -Off            (switches the form back to email)
#>
param([string]$TicketsRepo = 'jstetson-bit/pls-tickets', [switch]$Off, [string]$Token, [string]$KeyPath, [string]$RepoPath)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
$mk = Get-PlsMasterKey $KeyPath
if (-not $Off -and -not $Token) { $s = Read-Host 'Paste the tickets token' -AsSecureString; $Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
$t = $(if ($Off) { [pscustomobject]@{ repo = $TicketsRepo; token = '' } } else { [pscustomobject]@{ repo = $TicketsRepo; token = $Token.Trim() } })
$null = Invoke-PlsPublish -Updates @() -RepoPath $RepoPath -MK $mk -Tickets $t -Message 'Vault: ticket form settings'
Write-Host ($(if ($Off) { 'Ticket form switched to email.' } else { 'Ticket form switched on.' })) -ForegroundColor Green
