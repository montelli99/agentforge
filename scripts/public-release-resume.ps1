param(
  [string]$Branch = "vnext",
  [int]$PollSeconds = 10,
  [int]$PollCount = 18
)

$ErrorActionPreference = "Stop"

function Invoke-GhJson([string[]]$Arguments) {
  $raw = & gh @Arguments
  if ($LASTEXITCODE -ne 0) { throw "gh $($Arguments -join ' ') failed with exit code $LASTEXITCODE." }
  return ($raw -join "`n" | ConvertFrom-Json)
}

$repo = (Invoke-GhJson @("repo", "view", "--json", "nameWithOwner,visibility")).nameWithOwner
if (-not $repo) { throw "The GitHub repository could not be resolved." }

$auth = (& gh auth status 2>&1 | Out-String)
if ($auth -notmatch "workflow") {
  throw "GitHub authorization is missing the workflow scope. Run: gh auth refresh -h github.com -s workflow"
}

git diff --check
if ($LASTEXITCODE -ne 0) { throw "Whitespace errors must be fixed before publishing." }

git push --set-upstream origin $Branch
if ($LASTEXITCODE -ne 0) { throw "The release branch could not be pushed." }

$sha = (git rev-parse $Branch).Trim()
Write-Host "Pushed $repo/$Branch at $sha. Waiting for hosted CI..."

for ($attempt = 0; $attempt -lt $PollCount; $attempt++) {
  $runs = Invoke-GhJson @("run", "list", "-R", $repo, "--branch", $Branch, "--limit", "10", "--json", "databaseId,headSha,status,conclusion,url")
  $run = @($runs | Where-Object { $_.headSha -eq $sha } | Select-Object -First 1)
  if ($run.Count -gt 0) {
    $current = $run[0]
    if ($current.status -eq "completed") {
      if ($current.conclusion -ne "success") { throw "Hosted CI completed with '$($current.conclusion)': $($current.url)" }
      Write-Host "Hosted CI passed: $($current.url)"
      Write-Host "Release commit: $sha"
      exit 0
    }
    Write-Host "Hosted CI status: $($current.status)"
  } else {
    Write-Host "Waiting for a hosted CI run for $sha..."
  }
  Start-Sleep -Seconds $PollSeconds
}

throw "Hosted CI did not complete within the polling window. Inspect: gh run list -R $repo --branch $Branch"
