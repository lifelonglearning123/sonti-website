# Moves a top-level window so its *visible* frame lands exactly on a physical-pixel
# rectangle (Windows 11 windows carry invisible resize borders, so the raw window rect
# is corrected with DWM's extended frame bounds). Pins it topmost.
param(
  [Parameter(Mandatory = $true)][string]$TitleLike,
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [Parameter(Mandatory = $true)][int]$W,
  [Parameter(Mandatory = $true)][int]$H
)

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Win {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out RECT r, int size);
}
"@

[Win]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null  # per-monitor aware v2: physical pixels

$script:hwnd = [IntPtr]::Zero
$cb = [Win+EnumProc] {
  param($h, $l)
  $sb = New-Object System.Text.StringBuilder 512
  [Win]::GetWindowText($h, $sb, 512) | Out-Null
  if ([Win]::IsWindowVisible($h) -and $sb.ToString() -like $TitleLike) { $script:hwnd = $h; return $false }
  return $true
}
[Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
if ($script:hwnd -eq [IntPtr]::Zero) { throw "no visible window matching '$TitleLike'" }

$HWND_TOPMOST = [IntPtr](-1)
$SWP_SHOWWINDOW = 0x40
[Win]::ShowWindow($script:hwnd, 9) | Out-Null  # SW_RESTORE

$px = $X; $py = $Y; $pw = $W; $ph = $H
for ($i = 0; $i -lt 4; $i++) {
  [Win]::SetWindowPos($script:hwnd, $HWND_TOPMOST, $px, $py, $pw, $ph, $SWP_SHOWWINDOW) | Out-Null
  Start-Sleep -Milliseconds 400
  $wr = New-Object Win+RECT; $er = New-Object Win+RECT
  [Win]::GetWindowRect($script:hwnd, [ref]$wr) | Out-Null
  [Win]::DwmGetWindowAttribute($script:hwnd, 9, [ref]$er, 16) | Out-Null  # DWMWA_EXTENDED_FRAME_BOUNDS
  if ($er.L -eq $X -and $er.T -eq $Y -and ($er.R - $er.L) -eq $W -and ($er.B - $er.T) -eq $H) { break }
  $px = $X - ($er.L - $wr.L)
  $py = $Y - ($er.T - $wr.T)
  $pw = $W + ($er.L - $wr.L) + ($wr.R - $er.R)
  $ph = $H + ($er.T - $wr.T) + ($wr.B - $er.B)
}
"visible frame: L=$($er.L) T=$($er.T) W=$($er.R - $er.L) H=$($er.B - $er.T)"
