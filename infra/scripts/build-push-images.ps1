<#
.SYNOPSIS
Builds the four backend images and pushes them to the stack's ECR repos,
tagged with the current git SHA (immutable tags — one tag per commit).

.DESCRIPTION
Replaces the build/push half of the old backend/deploy.ps1. Repo URIs are
read from the CloudFormation stack outputs, so deploy-stack.ps1 must have
run at least once first.

.EXAMPLE
.\build-push-images.ps1
#>
param(
    [string]$StackName = "justateit-dev",
    [string]$AwsRegion = "us-east-2",
    # Defaults to the current git commit SHA, matching deploy-stack.ps1.
    [string]$ImageTag
)

$ErrorActionPreference = "Stop"

if (-not $ImageTag) {
    $ImageTag = (git rev-parse --short=12 HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Not in a git repository and no -ImageTag given." }
}

$BackendDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\backend")).Path

function Get-StackOutput([string]$Key) {
    $value = aws cloudformation describe-stacks `
        --region $AwsRegion `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='$Key'].OutputValue" `
        --output text
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value) -or $value -eq "None") {
        throw "Missing stack output '$Key'. Run deploy-stack.ps1 first."
    }
    return $value.Trim()
}

# Output key -> Dockerfile (paths relative to backend/, the build context).
$Images = [ordered]@{
    "ApiGatewayRepoUri"     = "api_gateway/Dockerfile"
    "UserServiceRepoUri"    = "services/user_service/Dockerfile"
    "CatalogServiceRepoUri" = "services/catalog_service/Dockerfile"
    "MediaServiceRepoUri"   = "services/media_service/Dockerfile"
}

# Resolve repo URIs, then log docker in to the registry.
$RepoUris = @{}
foreach ($key in $Images.Keys) { $RepoUris[$key] = Get-StackOutput $key }
$Registry = ($RepoUris["ApiGatewayRepoUri"] -split "/")[0]

Write-Host "Logging in to ECR registry $Registry..." -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $Registry
if ($LASTEXITCODE -ne 0) { throw "ECR login failed. Is the AWS CLI configured?" }

foreach ($key in $Images.Keys) {
    $Uri = $RepoUris[$key]
    $Dockerfile = Join-Path $BackendDir $Images[$key]
    $FullImage = "${Uri}:${ImageTag}"

    Write-Host "Building $FullImage..." -ForegroundColor Cyan
    docker build -t $FullImage -f $Dockerfile $BackendDir
    if ($LASTEXITCODE -ne 0) { throw "docker build failed for $FullImage." }

    Write-Host "Pushing $FullImage..." -ForegroundColor Cyan
    docker push $FullImage
    if ($LASTEXITCODE -ne 0) {
        throw "docker push failed for $FullImage. (Note: tags are immutable — a new commit gives a new tag.)"
    }
}

Write-Host "All four images pushed with tag '$ImageTag'." -ForegroundColor Green
Write-Host "If the stack was deployed with a different tag, re-run deploy-stack.ps1 -ImageTag $ImageTag." -ForegroundColor Yellow
