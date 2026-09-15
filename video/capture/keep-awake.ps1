# Holds the system and displays awake until the overnight recording has run, so the
# 02:14 capture doesn't grab a switched-off or locked screen. Exits by itself.
param([Parameter(Mandatory = $true)][datetime]$Until)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Awake {
  [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
}
"@

$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$ES_DISPLAY_REQUIRED = [uint32]2

while ((Get-Date) -lt $Until) {
  [Awake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_DISPLAY_REQUIRED) | Out-Null
  Start-Sleep -Seconds 30
}
[Awake]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
