<#
  Watch-Tickets.ps1 — runs right after Watch-Builds.ps1 every 2 minutes (same scheduled task). Token-free.

  1. Pulls the private tickets repo (filled by the "Report a problem" form on the downloads page).
  2. Each NEW ticket becomes a mailbox ticket for the seat (the seat inbox folder under docs/mailbox on the farm repo's `orders` branch,
     which the seat's poll reads) and is marked "Being fixed".
  3. Only when there was a new ticket: runs C:\PulseLabs\wake-seat.cmd (if the seat set one up) so the seat starts on it
     now instead of at its next poll. No ticket, no wake, no tokens.
  4. A seat can set a ticket's state by committing tickets/<id>/status.json, e.g. {"status":"owner","note":"needs Jason: ..."}
  5. Watch-Builds.ps1 leaves the release notes it published in C:\PulseLabs\fixed-refs.json; any "Fixes T-..." in them
     marks that ticket "Fixed in v<version>".
#>
[CmdletBinding()]
param(
  [string]$TicketsRepo = 'jstetson-bit/pls-tickets',
  [string]$TicketsPath = 'C:\PulseLabs\pls-tickets',
  [string]$FarmRepo = 'jstetson-bit/gundam-farm-note20',
  [string]$MailboxPath = 'C:\PulseLabs\farm-mailbox',
  [string]$MailboxBranch = 'orders',
  [string]$WakeCmd = 'C:\PulseLabs\wake-seat.cmd',
  [string]$FixedRefs = $(if ($env:PLS_FIXED_REFS) { $env:PLS_FIXED_REFS } else { 'C:\PulseLabs\fixed-refs.json' }),
  [string]$LogPath = $(if ($env:PLS_WATCH_LOG) { $env:PLS_WATCH_LOG } else { 'C:\PulseLabs\logs\watcher.log' }),
  [switch]$NoPush
)
$ErrorActionPreference = 'Stop'
function Log($m) { $line = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '  tickets: ' + $m; Add-Content -Path $LogPath -Value $line; Write-Host $line }
function Save-Json($path, $obj) { [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false)) }
New-Item -ItemType Directory -Force (Split-Path $LogPath) | Out-Null
try {
  if (-not (Test-Path $TicketsPath)) {
    git clone -q "https://github.com/$TicketsRepo" $TicketsPath 2>$null
    if ($LASTEXITCODE -ne 0) { return }   # tickets repo not made yet: nothing to do
  }
  git -C $TicketsPath pull --ff-only -q 2>$null | Out-Null
  $idxPath = Join-Path $TicketsPath 'index.json'
  $idx = $(if (Test-Path $idxPath) { Get-Content $idxPath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ tickets = @() } })
  $list = New-Object Collections.ArrayList; foreach ($t in @($idx.tickets)) { if ($t) { [void]$list.Add($t) } }
  $byId = @{}; foreach ($t in $list) { $byId[$t.id] = $t }
  $changed = $false; $woke = @()

  # new ticket folders -> index
  $dirs = @(Get-ChildItem (Join-Path $TicketsPath 'tickets') -Directory -ErrorAction SilentlyContinue)
  foreach ($d in $dirs) {
    $tf = Join-Path $d.FullName 'ticket.json'; if (-not (Test-Path $tf)) { continue }   # still uploading
    $t = Get-Content $tf -Raw | ConvertFrom-Json
    if (-not $byId[$t.id]) {
      $e = [pscustomobject]@{ id = $t.id; product = $t.product; productName = $t.productName; version = $t.version; platform = $t.platform
                              who = $t.who; when = $t.when; title = $t.title; status = 'new'; fixedIn = ''; note = '' }
      [void]$list.Add($e); $byId[$t.id] = $e; $changed = $true; Log "new ticket $($t.id) ($($t.productName) v$($t.version))"
    }
    # a seat's own status update
    $sf = Join-Path $d.FullName 'status.json'
    if (Test-Path $sf) {
      $s = Get-Content $sf -Raw | ConvertFrom-Json; $e = $byId[$t.id]
      if ($s.status -and ($e.status -ne $s.status -or $e.note -ne [string]$s.note)) { $e.status = $s.status; $e.note = [string]$s.note; if ($s.fixedIn) { $e.fixedIn = $s.fixedIn }; $changed = $true }
    }
  }

  # "Fixes T-..." in a published build's notes
  if (Test-Path $FixedRefs) {
    foreach ($f in @(Get-Content $FixedRefs -Raw | ConvertFrom-Json)) {
      foreach ($m in [regex]::Matches([string]$f.notes, 'T-\d{8}-\d{6}-[a-z0-9]{4}')) {
        $e = $byId[$m.Value]
        if ($e -and $e.status -ne 'fixed') { $e.status = 'fixed'; $e.fixedIn = $f.version; $e.note = ''; $changed = $true; Log "$($m.Value) fixed in $($f.product) v$($f.version)" }
      }
    }
    Remove-Item $FixedRefs -Force
  }

  # new -> mailbox ticket for the seat
  $fresh = @($list | Where-Object { $_.status -eq 'new' })
  if ($fresh.Count) {
    if (-not (Test-Path $MailboxPath)) { git clone -q --depth 1 --branch $MailboxBranch "https://github.com/$FarmRepo" $MailboxPath }
    git -C $MailboxPath pull --ff-only -q 2>$null | Out-Null
    # The seat inbox is the one docs\mailbox folder whose name starts with 'to-' (found at run time, not named here).
    $boxName = (Get-ChildItem (Join-Path $MailboxPath 'docs\mailbox') -Directory | Where-Object { $_.Name -like 'to-*' } | Select-Object -First 1).Name
    if (-not $boxName) { throw 'No seat inbox folder (docs\mailbox\to-*) in the farm repo.' }
    $box = Join-Path $MailboxPath (Join-Path 'docs\mailbox' $boxName)
    foreach ($e in $fresh) {
      $d = Join-Path $TicketsPath ("tickets\" + $e.id); $t = Get-Content (Join-Path $d 'ticket.json') -Raw | ConvertFrom-Json
      $log = ''; $lp = Join-Path $d 'log.txt'; if (Test-Path $lp) { $log = ((Get-Content $lp -TotalCount 300) -join "`n") }
      $web = "https://github.com/$TicketsRepo/tree/main/tickets/$($e.id)"
      $body = @"
From: Pulse Labs site — in-house ticket form ($($t.who))
Subject: TICKET $($e.id) — $($t.productName) v$($t.version) ($($t.platform)): $($t.title)
Type: ticket
Re: none

## What the tester wrote
$($t.text)

## Build
Product id ``$($t.product)``, version ``$($t.version)``, $($t.platform). Farm source: ``$($t.source)``
Device: $($t.device)
Screenshot and full log: $web $(if ($t.hasShot) { "(screenshot: $($t.shot))" } else { "(no screenshot)" })

## Log (first 300 lines)
``````
$log
``````

## How to close it
House rules support fast lane. When the fixed build is Released, put **Fixes $($e.id)** in that Release's notes: the
site marks the ticket "Fixed in v<version>" by itself. If it needs James, commit ``tickets/$($e.id)/status.json`` to
$TicketsRepo with ``{"status":"owner","note":"<one line on what he must decide>"}``.
"@
      $name = (Get-Date).ToString('yyyy-MM-dd-HHmm') + "-ticket-$($e.id).md"
      [IO.File]::WriteAllText((Join-Path $box $name), $body, (New-Object Text.UTF8Encoding $false))
      $e.status = 'queued'; $changed = $true; $woke += $e.id
    }
    if (-not $NoPush) {
      git -C $MailboxPath add ("docs/mailbox/" + $boxName) | Out-Null
      git -C $MailboxPath commit -q -m ("Tickets from the site: " + ($woke -join ', ')) | Out-Null
      git -C $MailboxPath push -q 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { git -C $MailboxPath pull --rebase -q 2>$null | Out-Null; git -C $MailboxPath push -q 2>$null | Out-Null }
    }
    Log ("queued for the seat: " + ($woke -join ', '))
  }

  if ($changed) {
    $idx = [pscustomobject]@{ updated = (Get-Date).ToString('o'); tickets = @($list | Sort-Object when -Descending) }
    Save-Json $idxPath $idx
    if (-not $NoPush) {
      git -C $TicketsPath add index.json | Out-Null
      git -C $TicketsPath commit -q -m "index: ticket states" | Out-Null
      git -C $TicketsPath push -q 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { git -C $TicketsPath pull --rebase -q 2>$null | Out-Null; git -C $TicketsPath push -q 2>$null | Out-Null }
    }
  }
  if ($woke.Count -and (Test-Path $WakeCmd)) {
    Log "waking the seat for $($woke -join ', ')"
    Start-Process -FilePath $WakeCmd -ArgumentList ($woke -join ' ') -WindowStyle Hidden
  }
}
catch { Log "ERROR: $($_.Exception.Message)" }
