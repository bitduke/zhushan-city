param([string]$Version = '4.0.2')

$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'cloudfunctions'
$results = Get-ChildItem $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } | ForEach-Object -Parallel {
  $directory = $_.FullName
  $name = $_.Name
  Push-Location $directory
  try {
    $setOutput = & npm pkg set "dependencies.wx-server-sdk=$using:Version" 2>&1
    $setExit = $LASTEXITCODE
    if ($setExit -eq 0) {
      $lockOutput = & npm install --package-lock-only --ignore-scripts 2>&1
      $lockExit = $LASTEXITCODE
    } else { $lockExit = $setExit; $lockOutput = @() }
    [pscustomobject]@{
      Function = $name
      Ok = ($setExit -eq 0 -and $lockExit -eq 0)
      Detail = if ($lockExit -eq 0) { '' } else { (@($setOutput) + @($lockOutput)) -join "`n" }
    }
  } finally { Pop-Location }
} -ThrottleLimit 3

$results | Sort-Object Function | Format-Table Function,Ok -AutoSize
if (@($results | Where-Object { -not $_.Ok }).Count) {
  $results | Where-Object { -not $_.Ok } | Format-List
  exit 1
}
Write-Output "Updated $($results.Count) cloud function packages to wx-server-sdk@$Version"
