param(
  [int]$Port = 3002,
  [int]$DurationSeconds = 28800,
  [int]$IntervalSeconds = 300,
  [string]$LogPath = (Join-Path $env:TEMP "agentforge-vnext-soak.log")
)

$ErrorActionPreference = "Stop"
$agentForgeSoakBaseUrl = "http://127.0.0.1:$Port"
$agentForgeSoakPaths = @("/api/status", "/api/readiness", "/api/agents", "/api/tasks", "/api/compute")
$agentForgeSoakDeadline = (Get-Date).AddSeconds($DurationSeconds)

while ((Get-Date) -lt $agentForgeSoakDeadline) {
  $agentForgeSoakTimestamp = (Get-Date).ToString("o")
  $agentForgeSoakFailures = [System.Collections.Generic.List[string]]::new()

  foreach ($agentForgeSoakPath in $agentForgeSoakPaths) {
    try {
      $agentForgeSoakResponse = Invoke-WebRequest -Uri "$agentForgeSoakBaseUrl$agentForgeSoakPath" -Method Get -TimeoutSec 15
      if ($agentForgeSoakResponse.StatusCode -ne 200 -or $agentForgeSoakResponse.RawContentLength -eq 0) {
        $agentForgeSoakFailures.Add("$agentForgeSoakPath returned HTTP $($agentForgeSoakResponse.StatusCode) or an empty body")
      }
    } catch {
      $agentForgeSoakFailures.Add("$agentForgeSoakPath failed: $($_.Exception.Message)")
    }
  }

  if ($agentForgeSoakFailures.Count -eq 0) {
    Add-Content -LiteralPath $LogPath -Value "$agentForgeSoakTimestamp PASS all $($agentForgeSoakPaths.Count) endpoints"
  } else {
    Add-Content -LiteralPath $LogPath -Value "$agentForgeSoakTimestamp FAIL $($agentForgeSoakFailures -join '; ')"
  }

  $agentForgeSoakRemainingSeconds = ($agentForgeSoakDeadline - (Get-Date)).TotalSeconds
  if ($agentForgeSoakRemainingSeconds -gt 0) {
    $agentForgeSoakSleepSeconds = [Math]::Min($IntervalSeconds, [Math]::Ceiling($agentForgeSoakRemainingSeconds))
    Start-Sleep -Seconds $agentForgeSoakSleepSeconds
  }
}

Add-Content -LiteralPath $LogPath -Value "$((Get-Date).ToString('o')) COMPLETE"
