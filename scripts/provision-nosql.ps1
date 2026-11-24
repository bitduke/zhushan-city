param(
  [Parameter(Mandatory=$true)][string]$EnvId
)

$collections = @(
  'merchant', 'merchant_staff', 'staff_invite', 'merchant_application',
  'merchant_application_open', 'coupon', 'user_coupon', 'claim_request',
  'appointment', 'appointment_capacity', 'scan_token', 'scan_log',
  'scan_last', 'scan_attribution', 'verify_log', 'benefit_placement',
  'cooperation', 'cooperation_open', 'cooperation_bill', 'cooperation_result',
  'new_customer_lock', 'cooperation_payment', 'cooperation_payment_ref',
  'merchant_daily_stat', 'info', 'report', 'report_open', 'app_config', 'audit_log'
)

$results = $collections | ForEach-Object -Parallel {
  $name = $_
  $body = @{
    EnvId = $using:EnvId
    TableName = $name
    PermissionInfo = @{ AclTag = 'ADMINONLY'; EnvId = $using:EnvId }
  } | ConvertTo-Json -Compress -Depth 5
  $output = & npx --yes --package=@cloudbase/cli@3.9.4 tcb api tcb CreateTable --api-version 2018-06-08 --body $body -r ap-shanghai --json 2>&1
  [pscustomobject]@{
    Name = $name
    Ok = ($LASTEXITCODE -eq 0 -and ($output -join "`n") -match '"RequestId"')
    Detail = if ($LASTEXITCODE -eq 0) { '' } else { ($output -join "`n") }
  }
} -ThrottleLimit 2

$results | Sort-Object Name | Format-Table Name,Ok -AutoSize
if (@($results | Where-Object { -not $_.Ok }).Count) {
  $results | Where-Object { -not $_.Ok } | Format-List
  exit 1
}
Write-Output "Created $($results.Count) ADMINONLY business collections in $EnvId"
