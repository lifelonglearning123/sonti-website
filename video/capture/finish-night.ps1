# Runs after the overnight takes: swaps the real 02:14 recording in for the dry-run placeholder
# and renders a review copy, so the film is waiting in the morning. Falls back to the 02:24 backup
# take; does nothing (and says so in the log) if neither produced usable files.
# No ErrorActionPreference=Stop: npx and ffmpeg log to stderr, which Windows PowerShell would
# turn into fatal errors. Each step checks its own output instead.
$capture ='C:\python\website - sonti\video\capture'
$project = 'C:\python\website - sonti\video\our-name-is-on-it'
$night = Join-Path $capture 'out\night'
$log = Join-Path $night 'finish-log.txt'
function Log($m) { "$(Get-Date -Format s)  $m" | Tee-Object -FilePath $log -Append }

$pick = $null
foreach ($stamp in 'take-021405', 'backup-022405') {
  $page = Join-Path $night "$stamp-page.mp4"
  $clock = Join-Path $night "$stamp-clock.mp4"
  if ((Test-Path $page) -and (Test-Path $clock) -and (Get-Item $page).Length -gt 200000 -and (Get-Item $clock).Length -gt 5000) {
    $pick = @{ stamp = $stamp; page = $page; clock = $clock }
    break
  }
  Log "no usable files for $stamp"
}
if (-not $pick) { Log 'nothing to swap in; placeholder stays'; exit 1 }

Copy-Item -LiteralPath $pick.page -Destination (Join-Path $project 'assets\footage\night-page.mp4') -Force
Copy-Item -LiteralPath $pick.clock -Destination (Join-Path $project 'assets\footage\night-clock.mp4') -Force
Log "swapped in $($pick.stamp)"

$renders = Join-Path $project 'renders'
New-Item -ItemType Directory -Force $renders | Out-Null
$raw = Join-Path $renders 'our-name-is-on-it-v1-raw.mp4'
$final = Join-Path $renders 'our-name-is-on-it-v1.mp4'
Push-Location $project
try {
  & npx --yes hyperframes@0.8.34 render --fps 60 --quality high --video-frame-format png --output $raw 2>&1 | Out-File -FilePath (Join-Path $night 'finish-render.txt') -Encoding utf8
  if (-not (Test-Path $raw)) {
    # A render during the build was killed for low memory; retry on the one-worker safe profile.
    Log 'render failed; retrying with --low-memory-mode'
    & npx --yes hyperframes@0.8.34 render --fps 60 --quality high --video-frame-format png --low-memory-mode --output $raw 2>&1 | Out-File -FilePath (Join-Path $night 'finish-render-retry.txt') -Encoding utf8
  }
} finally { Pop-Location }
if (-not (Test-Path $raw)) { Log 'render failed twice — see finish-render*.txt'; exit 1 }

# TikTok loudness: two-pass -14 LUFS with a peak limiter; picture copied untouched.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $capture 'loudness.ps1') -In $raw -Out $final
if (Test-Path $final) { Log "rendered $final" } else { Log 'loudness pass failed; raw render kept' }
