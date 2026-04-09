$ErrorActionPreference = 'Stop'

Write-Host "Starting ECS Environment Injection..." -ForegroundColor Cyan

# 1. Parse the local .env file
$EnvFile = ".\.env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "Cannot find .env file at $EnvFile" -ForegroundColor Red
    exit 1
}

$EnvVars = @()
foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^([^#=]+)=(.*)$') {
        $EnvVars += @{
            name = $matches[1].Trim()
            value = $matches[2].Trim()
        }
    }
}
Write-Host "Successfully parsed $($EnvVars.Count) environment variables from .env file." -ForegroundColor Green


# 2. Download the current Task Definition
Write-Host "Downloading latest Blueprint from AWS..." -ForegroundColor Yellow
$RawJson = aws ecs describe-task-definition --task-definition justateit-backend-task --region us-east-2 --no-cli-pager
$TaskDefJson = $RawJson | ConvertFrom-Json

# 3. Update the containers
$Containers = $TaskDefJson.taskDefinition.containerDefinitions
foreach ($c in $Containers) {
    $c.environment = $EnvVars
}

# 4. Prepare registration variables
$Family = $TaskDefJson.taskDefinition.family
$TaskRole = $TaskDefJson.taskDefinition.taskRoleArn
$ExecRole = $TaskDefJson.taskDefinition.executionRoleArn
$NetworkMode = $TaskDefJson.taskDefinition.networkMode
$Cpu = $TaskDefJson.taskDefinition.cpu
$Memory = $TaskDefJson.taskDefinition.memory
$RequiresComp = $TaskDefJson.taskDefinition.requiresCompatibilities
$RuntimePlatform = $TaskDefJson.taskDefinition.runtimePlatform

# Convert containers to JSON string
$ContainersJson = $Containers | ConvertTo-Json -Depth 10 -Compress

# 5. Register new revision
Write-Host "Registering new Task Definition Revision with AWS..." -ForegroundColor Yellow

# Using splatting or direct arguments to avoid complex JSON payload file issues
$RegResult = aws ecs register-task-definition `
    --family $Family `
    --task-role-arn $TaskRole `
    --execution-role-arn $ExecRole `
    --network-mode $NetworkMode `
    --container-definitions "$ContainersJson" `
    --requires-compatibilities $RequiresComp `
    --cpu $Cpu `
    --memory $Memory `
    --runtime-platform "cpuArchitecture=$($RuntimePlatform.cpuArchitecture),operatingSystemFamily=$($RuntimePlatform.operatingSystemFamily)" `
    --region us-east-2 `
    --no-cli-pager

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to register new task definition." -ForegroundColor Red
    exit 1
}

# 6. Verify
$NewRevision = ($RegResult | ConvertFrom-Json).taskDefinition.revision
Write-Host "SUCCESS! Registered revision: $NewRevision" -ForegroundColor Green

Write-Host "`nVerifying environment variables in AWS..." -ForegroundColor Yellow
$Check = aws ecs describe-task-definition --task-definition "justateit-backend-task:$NewRevision" --region us-east-2 --query 'taskDefinition.containerDefinitions[0].environment' --no-cli-pager | ConvertFrom-Json
if ($Check.Count -gt 0) {
    Write-Host "CONFIRMED: $($Check.Count) variables are live in revision $NewRevision." -ForegroundColor Green
} else {
    Write-Host "WARNING: Environment array is still empty in AWS." -ForegroundColor Red
}
