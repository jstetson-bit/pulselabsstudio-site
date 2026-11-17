# PlsVault.ps1 — shared crypto for the Pulse Labs private downloads vault.
# Dot-source it:  . "$PSScriptRoot\PlsVault.ps1"
# Works in Windows PowerShell 5.1 (admin window) and PowerShell 7.
#
# Format of every sealed blob:  "PLS1" | IV(16) | AES-256-CBC ciphertext | HMAC-SHA256(32)
#   key = 64 bytes: first 32 encrypt, last 32 authenticate. The HMAC covers "PLS1"+IV+ciphertext,
#   so a tampered or wrong-key file is rejected before anything is decrypted.
# Users: password -> PBKDF2-SHA256 (600,000 rounds, per-user salt) -> 64-byte key that unlocks
#   ("unwraps") the master key. The master key never leaves the farm except wrapped like that.

$script:PlsMagic = [byte[]](0x50,0x4C,0x53,0x31)   # "PLS1"
$script:PlsIter  = 600000

function Get-PlsRandom([int]$n) { $b = New-Object byte[] $n; $r = [Security.Cryptography.RandomNumberGenerator]::Create(); $r.GetBytes($b); $r.Dispose(); return ,$b }
function Get-PlsSlice([byte[]]$a, [int]$start, [int]$len) { $o = New-Object byte[] $len; [Array]::Copy($a, $start, $o, 0, $len); return ,$o }

function Protect-PlsBytes([byte[]]$Key, [byte[]]$Data) {
  $aes = [Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256; $aes.Mode = [Security.Cryptography.CipherMode]::CBC; $aes.Padding = [Security.Cryptography.PaddingMode]::PKCS7
  $aes.Key = Get-PlsSlice $Key 0 32
  $iv = Get-PlsRandom 16; $aes.IV = $iv
  $enc = $aes.CreateEncryptor(); $ct = $enc.TransformFinalBlock($Data, 0, $Data.Length); $enc.Dispose(); $aes.Dispose()
  $body = New-Object byte[] (4 + 16 + $ct.Length)
  [Array]::Copy($script:PlsMagic, 0, $body, 0, 4); [Array]::Copy($iv, 0, $body, 4, 16); [Array]::Copy($ct, 0, $body, 20, $ct.Length)
  $h = New-Object Security.Cryptography.HMACSHA256 (,(Get-PlsSlice $Key 32 32)); $tag = $h.ComputeHash($body); $h.Dispose()
  $out = New-Object byte[] ($body.Length + 32)
  [Array]::Copy($body, 0, $out, 0, $body.Length); [Array]::Copy($tag, 0, $out, $body.Length, 32)
  return ,$out
}

function Unprotect-PlsBytes([byte[]]$Key, [byte[]]$Blob) {
  if ($Blob.Length -lt 4 + 16 + 16 + 32) { throw 'Vault blob is too short.' }
  for ($i = 0; $i -lt 4; $i++) { if ($Blob[$i] -ne $script:PlsMagic[$i]) { throw 'Not a Pulse Labs vault blob.' } }
  $n = $Blob.Length - 32
  $h = New-Object Security.Cryptography.HMACSHA256 (,(Get-PlsSlice $Key 32 32)); $calc = $h.ComputeHash($Blob, 0, $n); $h.Dispose()
  $diff = 0; for ($i = 0; $i -lt 32; $i++) { $diff = $diff -bor ($calc[$i] -bxor $Blob[$n + $i]) }
  if ($diff -ne 0) { throw 'Wrong key or damaged file (check failed).' }
  $aes = [Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256; $aes.Mode = [Security.Cryptography.CipherMode]::CBC; $aes.Padding = [Security.Cryptography.PaddingMode]::PKCS7
  $aes.Key = Get-PlsSlice $Key 0 32; $aes.IV = Get-PlsSlice $Blob 4 16
  $dec = $aes.CreateDecryptor(); $pt = $dec.TransformFinalBlock($Blob, 20, $n - 20); $dec.Dispose(); $aes.Dispose()
  return ,$pt
}

function Get-PlsUserId([string]$Name) {
  $sha = [Security.Cryptography.SHA256]::Create()
  $d = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes('pls-vault-user:' + $Name.Trim().ToLowerInvariant())); $sha.Dispose()
  return (($d[0..11] | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Get-PlsPasswordKey([string]$Password, [byte[]]$Salt, [int]$Iter) {
  $kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes ([Text.Encoding]::UTF8.GetBytes($Password)), $Salt, $Iter, ([Security.Cryptography.HashAlgorithmName]::SHA256)
  $k = $kdf.GetBytes(64); $kdf.Dispose(); return ,$k
}

function Get-PlsMasterKey([string]$KeyPath) {
  if (-not (Test-Path $KeyPath)) { throw "Vault master key not found at $KeyPath. Run Vault-User.ps1 -Init on the first machine, then copy that file to the others." }
  $k = [Convert]::FromBase64String((Get-Content $KeyPath -Raw).Trim())
  if ($k.Length -ne 64) { throw "Vault master key at $KeyPath is damaged." }
  return ,$k
}

function Read-PlsVault([string]$RepoPath) {
  $p = Join-Path $RepoPath 'vault\vault.json'
  if (-not (Test-Path $p)) { throw "No vault.json in $RepoPath\vault. Run Vault-User.ps1 -Init first." }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}
function Write-PlsVault([string]$RepoPath, $Vault) {
  $dir = Join-Path $RepoPath 'vault'; New-Item -ItemType Directory -Force $dir | Out-Null
  [IO.File]::WriteAllText((Join-Path $dir 'vault.json'), ($Vault | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))
}
function Get-PlsManifest($Vault, [byte[]]$MK) {
  $bytes = Unprotect-PlsBytes $MK ([Convert]::FromBase64String($Vault.manifest))
  return ([Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json)
}
function Set-PlsManifest($Vault, [byte[]]$MK, $Manifest) {
  $json = $Manifest | ConvertTo-Json -Depth 10 -Compress
  $Vault.manifest = [Convert]::ToBase64String((Protect-PlsBytes $MK ([Text.Encoding]::UTF8.GetBytes($json))))
}

function Get-PlsDefaultKeyPath { if ($env:PLS_VAULT_KEY) { return $env:PLS_VAULT_KEY } return 'C:\PulseLabs\vault.key' }
function Get-PlsDefaultRepoPath { if ($env:PLS_SITE_REPO) { return $env:PLS_SITE_REPO } return 'C:\PulseLabs\pulselabsstudio-site' }
