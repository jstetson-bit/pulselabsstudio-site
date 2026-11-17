<#
  Vault-User.ps1 — set up the private downloads vault and manage who can sign in.

  First time ever (one farm machine):     .\Vault-User.ps1 -Init
  Add a person (asks for the password):   .\Vault-User.ps1 -Add -Name Jason
  Change someone's password:              .\Vault-User.ps1 -Add -Name Katy      (same command again)
  Remove a person:                        .\Vault-User.ps1 -Remove -Name Zelio
  See who's on the list:                  .\Vault-User.ps1 -List

  The master key file (default C:\PulseLabs\vault.key) is the one thing to guard. Copy it to every
  farm machine that publishes, never put it in a repo. Lose it and everything has to be republished.
#>
[CmdletBinding(DefaultParameterSetName = 'List')]
param(
  [Parameter(ParameterSetName = 'Init')][switch]$Init,
  [Parameter(ParameterSetName = 'Add')][switch]$Add,
  [Parameter(ParameterSetName = 'Remove')][switch]$Remove,
  [Parameter(ParameterSetName = 'List')][switch]$List,
  [Parameter(ParameterSetName = 'Add', Mandatory)][Parameter(ParameterSetName = 'Remove', Mandatory)][string]$Name,
  [Parameter(ParameterSetName = 'Add')][Security.SecureString]$Password,
  [string]$KeyPath, [string]$RepoPath, [switch]$NoPush
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
function Say($m) { Write-Host "[vault] $m" -ForegroundColor Cyan }

if (-not (Test-Path $RepoPath)) { git clone https://github.com/jstetson-bit/pulselabsstudio-site $RepoPath | Out-Null }
Push-Location $RepoPath
try {
  if (-not $NoPush) { git pull --ff-only | Out-Null }

  if ($Init) {
    if (Test-Path $KeyPath) { throw "A master key already exists at $KeyPath. Not overwriting it." }
    if (Test-Path (Join-Path $RepoPath 'vault\vault.json')) { throw "This site already has a vault. Copy its vault.key from the machine that made it to $KeyPath." }
    New-Item -ItemType Directory -Force (Split-Path $KeyPath) | Out-Null
    $mk = Get-PlsRandom 64
    [IO.File]::WriteAllText($KeyPath, [Convert]::ToBase64String($mk))
    $vault = [pscustomobject]@{ v = 1; iter = $script:PlsIter; users = [pscustomobject]@{}; manifest = '' }
    Set-PlsManifest $vault $mk ([pscustomobject]@{ v = 2; updated = (Get-Date).ToString('yyyy-MM-dd'); products = @() })
    Write-PlsVault $RepoPath $vault
    Say "Master key written to $KeyPath  (back it up; copy it to other farm machines)"
    $msg = 'Create private downloads vault'
  }
  else {
    $vault = Read-PlsVault $RepoPath
    if ($List) {
      $n = @($vault.users.PSObject.Properties).Count
      Say "$n sign-in(s) on file. (Names are stored only as fingerprints, so the list can't show them.)"
      return
    }
    $mk = Get-PlsMasterKey $KeyPath
    $null = Get-PlsManifest $vault $mk   # proves this key belongs to this vault before touching users
    $id = Get-PlsUserId $Name
    if ($Remove) {
      if (-not $vault.users.PSObject.Properties[$id]) { throw "No sign-in named '$Name'." }
      $vault.users.PSObject.Properties.Remove($id); $msg = 'Remove a vault sign-in'
      Say "Removed '$Name'."
    } else {
      if (-not $Password) {
        $Password = Read-Host "Password for $Name" -AsSecureString
        $again = Read-Host "Type it again" -AsSecureString
        $a = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
        $b = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($again))
        if ($a -cne $b) { throw 'The two passwords did not match. Nothing changed.' }
      }
      $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
      if ($plain.Length -lt 8) { throw 'Use at least 8 characters.' }
      $salt = Get-PlsRandom 16
      $kek = Get-PlsPasswordKey $plain $salt ([int]$vault.iter)
      $entry = [pscustomobject]@{ salt = [Convert]::ToBase64String($salt); wrap = [Convert]::ToBase64String((Protect-PlsBytes $kek $mk)) }
      if ($vault.users.PSObject.Properties[$id]) { $vault.users.$id = $entry; Say "Password changed for '$Name'." }
      else { $vault.users | Add-Member -NotePropertyName $id -NotePropertyValue $entry; Say "Added '$Name'." }
      $msg = 'Update vault sign-ins'
    }
    Write-PlsVault $RepoPath $vault
  }

  if (-not $NoPush) {
    git add vault/vault.json | Out-Null; git commit -m $msg | Out-Null; git push | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'git push failed.' }
    Say 'Saved. The site picks it up in about a minute.'
  }
}
finally { Pop-Location }
