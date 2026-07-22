<#
.SYNOPSIS
Publishes the Expo web build (frontend/dist) to the web hosting stack.

.DESCRIPTION
Reads the WebBucketName and DistributionId outputs of the (already
deployed) web-hosting.yml stack, syncs frontend/dist to the bucket,
and invalidates the CloudFront cache.

Deploy the stack once first:
  aws cloudformation deploy --region us-east-2 --stack-name justateit-web `
      --template-file ..\cloudformation\web-hosting.yml

Build the web bundle before running this script:
  cd ..\..\frontend ; npm run build:web

.EXAMPLE
.\deploy-web.ps1
#>
param(
    [string]$StackName = "justateit-web",
    [string]$AwsRegion = "us-east-2"
)

$ErrorActionPreference = "Stop"

$DistPath = Join-Path $PSScriptRoot "..\..\frontend\dist"
if (-not (Test-Path (Join-Path $DistPath "index.html"))) {
    throw "No web build found at $DistPath. Run 'npm run build:web' in frontend/ first."
}

function Get-StackOutput([string]$Key) {
    $value = aws cloudformation describe-stacks `
        --region $AwsRegion `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='$Key'].OutputValue" `
        --output text
    if ($LASTEXITCODE -ne 0 -or -not $value -or $value -eq "None") {
        throw "Could not read output '$Key' from stack '$StackName'. Is the stack deployed?"
    }
    return $value.Trim()
}

$Bucket = Get-StackOutput "WebBucketName"
$DistributionId = Get-StackOutput "DistributionId"

Write-Host "Syncing $DistPath -> s3://$Bucket ..." -ForegroundColor Cyan
aws s3 sync $DistPath "s3://$Bucket" --region $AwsRegion --delete
if ($LASTEXITCODE -ne 0) { throw "S3 sync failed." }

Write-Host "Invalidating CloudFront distribution $DistributionId ..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "CloudFront invalidation failed." }

$WebUrl = Get-StackOutput "WebUrl"
Write-Host "Done. Site: $WebUrl" -ForegroundColor Green
