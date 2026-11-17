<#
  Publish-ToSite.ps1 — put one build into the private downloads vault BY HAND.
  (Normally you never need this: Watch-Builds.ps1 does it automatically from the farm's Releases.)

    .\Publish-ToSite.ps1 -Files .\PLSPDF-v1.4.0-Android-APK.apk,.\PLSPDF-v1.4.0-PC-exe.zip
    .\Publish-ToSite.ps1 -Files .\x.apk -Name "PLS PDF" -Purpose "Offline PDF reader, signer and builder" `
        -Bullets "Reads and signs PDFs","Merges and splits","No account, no internet" `
        -Icon .\icon.png -Screenshots .\start.png,.\editor.png -Captions "Start screen","Editor" -Notes "What changed"

  Product name, id and version are read from the file name (Name-vX.Y.Z...). Override with -Id / -Version.
  Shelf: .apk -> Droid, .exe/.msi or a zip named -PC -> PC, .crx or a zip named chrome/extension -> Chrome.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string[]]$Files,
  [string]$Id, [string]$Version, [ValidateSet('android','windows','chrome')][string]$Platform,
  [string]$Name, [string]$Purpose, [string[]]$Bullets, [string]$Description, [string]$Notes,
  [string]$Icon, [string[]]$Screenshots, [string[]]$Captions,
  [string]$KeyPath, [string]$RepoPath, [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\PlsVault.ps1"; . "$PSScriptRoot\PlsSite.ps1"
if (-not $KeyPath) { $KeyPath = Get-PlsDefaultKeyPath }
if (-not $RepoPath) { $RepoPath = Get-PlsDefaultRepoPath }
if (-not (Test-Path $RepoPath)) { git clone -q https://github.com/jstetson-bit/pulselabsstudio-site $RepoPath }
$mk = Get-PlsMasterKey $KeyPath

$byId = @{}
foreach ($f in $Files) {
  $fi = Get-Item -LiteralPath $f
  $key = Get-PlsProductKey $fi.Name
  $pid_ = $(if ($Id) { $Id } elseif ($key) { $key.id } else { throw "Can't read a name and version from $($fi.Name). Add -Id and -Version." })
  $ver = $(if ($Version) { $Version } elseif ($key) { $key.version } else { throw "Add -Version for $($fi.Name)." })
  $plat = $(if ($Platform) { $Platform } else { Get-PlsPlatform $fi.Name })
  if (-not $plat) { throw "Don't know which shelf $($fi.Name) goes on. Add -Platform android|windows|chrome." }
  if (-not $byId[$pid_]) { $byId[$pid_] = @{ id = $pid_; name = $(if ($Name) { $Name } elseif ($key) { $key.name }); files = @() } }
  $byId[$pid_].files += @{ path = $fi.FullName; platform = $plat; version = $ver; notes = $Notes; source = 'by hand' }
}
$updates = @($byId.Values)
$first = $updates[0]
if ($Purpose) { $first.purpose = $Purpose }
if ($Bullets) { $first.bullets = $Bullets }
if ($Description) { $first.description = $Description }
if ($Icon) { $first.icon = (Resolve-Path $Icon).Path }
if ($Screenshots) { $i = 0; $first.shots = @($Screenshots | ForEach-Object { $c = $(if ($Captions -and $Captions.Count -gt $i) { $Captions[$i] } else { '' }); $i++; @{ path = (Resolve-Path $_).Path; caption = $c } }) }

$n = Invoke-PlsPublish -Updates $updates -RepoPath $RepoPath -MK $mk -Message "Vault: publish by hand" -DryRun:$DryRun
Write-Host "[publish] $n change(s). Live in about 2 minutes: https://pulselabsstudio.com/downloads.html" -ForegroundColor Green
