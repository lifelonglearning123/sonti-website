# Two-pass EBU R128 normalisation for TikTok: -14 LUFS integrated, peaks held under -1.5 dBFS.
# Picture is copied untouched. A single-pass loudnorm landed the draft at -15.5 LUFS / +0.7 dBTP.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out
)
# No ErrorActionPreference=Stop: Windows PowerShell turns ffmpeg's stderr log into error
# records, which Stop would make fatal. Failures are checked explicitly below instead.
# TP and the limiter sit below -1 dBTP on purpose: AAC re-encoding added ~0.7 dB of overshoot
# on the first Built In A Day render (measured -0.8 dBTP at -1.5).
$target = 'I=-14:TP=-2:LRA=11'

$measure = & ffmpeg -hide_banner -nostats -i $In -vn -af "loudnorm=${target}:print_format=json" -f null - 2>&1 | ForEach-Object { "$_" }
$m = [regex]::Match(($measure -join "`n"), '\{[^{}]*"input_i"[^{}]*\}').Value | ConvertFrom-Json
if (-not $m) { throw "loudnorm measurement failed for $In" }

$filter = "loudnorm=${target}:measured_I=$($m.input_i):measured_TP=$($m.input_tp):measured_LRA=$($m.input_lra):measured_thresh=$($m.input_thresh):offset=$($m.target_offset):linear=true,alimiter=limit=0.84:level=false"
& ffmpeg -y -loglevel error -i $In -c:v copy -af $filter -ar 48000 -c:a aac -b:a 192k -movflags +faststart $Out
if (-not (Test-Path $Out)) { throw "loudness pass produced no file" }
