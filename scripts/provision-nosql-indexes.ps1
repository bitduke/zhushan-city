param(
  [Parameter(Mandatory=$true)][string]$EnvId
)

$definitions = @(
  @{ Table='user_coupon'; Name='user_claimed_at'; Keys=@(@('user_id','1'),@('claimed_at','-1')) },
  @{ Table='appointment'; Name='merchant_requested_at'; Keys=@(@('merchant_id','1'),@('requested_at','-1')) },
  @{ Table='verify_log'; Name='merchant_verified_at'; Keys=@(@('merchant_id','1'),@('verified_at','-1')) },
  @{ Table='report'; Name='status_created_at'; Keys=@(@('status','1'),@('created_at','-1')) },
  @{ Table='cooperation_result'; Name='cooperation_status_confirmed'; Keys=@(@('cooperation_id','1'),@('status','1'),@('confirmed_at','-1')) },
  @{ Table='cooperation_result'; Name='cooperation_verified_at'; Keys=@(@('cooperation_id','1'),@('verified_at','-1')) },
  @{ Table='info'; Name='status_category_town_created'; Keys=@(@('status','1'),@('category_id','1'),@('town','1'),@('created_at','-1')) },
  @{ Table='user'; Name='created_at_asc'; Keys=@(@('created_at','1')) },
  @{ Table='coupon'; Name='merchant_status_end'; Keys=@(@('merchant_id','1'),@('status','1'),@('end_time','1')) },
  @{ Table='benefit_placement'; Name='source_status_sort'; Keys=@(@('source_merchant_id','1'),@('status','1'),@('sort','1')) },
  @{ Table='merchant_daily_stat'; Name='date_merchant'; Keys=@(@('date','-1'),@('merchant_id','1')) },
  @{ Table='cooperation_payment'; Name='cooperation_submitted_at'; Keys=@(@('cooperation_id','1'),@('submitted_at','-1')) }
)

$results = $definitions | ForEach-Object -Parallel {
  $definition = $_
  $keys = @($definition.Keys | ForEach-Object { @{ Name = $_[0]; Direction = $_[1] } })
  $body = @{
    EnvId = $using:EnvId
    TableName = $definition.Table
    CreateIndexes = @(@{
      IndexName = $definition.Name
      MgoKeySchema = @{ MgoIndexKeys = $keys; MgoIsUnique = $false; MgoIsSparse = $false }
    })
  } | ConvertTo-Json -Compress -Depth 8
  $output = & npx --yes --package=@cloudbase/cli@3.9.4 tcb api tcb UpdateTable --api-version 2018-06-08 --body $body -r ap-shanghai --json 2>&1
  [pscustomobject]@{
    Table = $definition.Table
    Name = $definition.Name
    Ok = ($LASTEXITCODE -eq 0 -and ($output -join "`n") -match '"RequestId"')
    Detail = if ($LASTEXITCODE -eq 0) { '' } else { ($output -join "`n") }
  }
} -ThrottleLimit 2

$results | Sort-Object Table,Name | Format-Table Table,Name,Ok -AutoSize
if (@($results | Where-Object { -not $_.Ok }).Count) {
  $results | Where-Object { -not $_.Ok } | Format-List
  exit 1
}
Write-Output "Created $($results.Count) business indexes in $EnvId"
