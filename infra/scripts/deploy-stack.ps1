<#
.SYNOPSIS
Deploys (creates or updates) the JustAteIt dev backend CloudFormation stack.

.DESCRIPTION
Replaces the old hand-managed AWS setup (backend/deploy.ps1 service updates,
inject_env.*). All infrastructure lives in infra/cloudformation/dev-backend.yml.

The task definition references images tagged with -ImageTag (defaults to the
current git SHA). On the first deploy the ECR repos are created here, then
push images with build-push-images.ps1 using the same tag.

.EXAMPLE
.\deploy-stack.ps1 -AllowedIngressCidr "203.0.113.7/32" `
    -DatabaseUrlParameterArn "arn:aws:ssm:us-east-2:123456789012:parameter/justateit/dev/database-url"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$AllowedIngressCidr,

    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrlParameterArn,

    # Must be lowercase (it prefixes the ECR repository names).
    [string]$StackName = "justateit-dev",

    [string]$AwsRegion = "us-east-2",

    # Immutable image tag baked into the task definition. Defaults to the
    # current git commit SHA, matching build-push-images.ps1.
    [string]$ImageTag
)

$ErrorActionPreference = "Stop"

if (-not $ImageTag) {
    $ImageTag = (git rev-parse --short=12 HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Not in a git repository and no -ImageTag given." }
}

$TemplatePath = Join-Path $PSScriptRoot "..\cloudformation\dev-backend.yml"

Write-Host "Deploying stack '$StackName' in $AwsRegion (ImageTag: $ImageTag)..." -ForegroundColor Cyan

aws cloudformation deploy `
    --region $AwsRegion `
    --stack-name $StackName `
    --template-file $TemplatePath `
    --capabilities CAPABILITY_IAM `
    --no-fail-on-empty-changeset `
    --parameter-overrides `
        "ImageTag=$ImageTag" `
        "AllowedIngressCidr=$AllowedIngressCidr" `
        "DatabaseUrlParameterArn=$DatabaseUrlParameterArn"

if ($LASTEXITCODE -ne 0) { throw "CloudFormation deploy failed." }

Write-Host "Stack outputs:" -ForegroundColor Green
aws cloudformation describe-stacks `
    --region $AwsRegion `
    --stack-name $StackName `
    --query "Stacks[0].Outputs[].{Key:OutputKey,Value:OutputValue}" `
    --output table
