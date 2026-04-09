param (
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "all",
    
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-2"
)

# Configuration
$ClusterName = "justateit-prod-cluster"
$RegistryUrl = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

# The 3 internal microservices + the gateway
$Services = @{
    "api_gateway" = "api_gateway/Dockerfile";
    "user_service" = "services/user_service/Dockerfile";
    "catalog_service" = "services/catalog_service/Dockerfile";
    "media_service" = "services/media_service/Dockerfile";
}

Write-Host "Logging into AWS ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $RegistryUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to AWS ECR. Make sure your AWS CLI is configured." -ForegroundColor Red
    exit 1
}

function Deploy-Service ([string]$Name, [string]$DockerfilePath) {
    Write-Host "DEPLOYING $Name" -ForegroundColor Cyan
    $ImageName = "justateit-$Name"
    $FullImageUrl = "${RegistryUrl}/${ImageName}:latest"

    Write-Host "1. Building Docker image..."
    docker build -t $ImageName -f $DockerfilePath .
    
    if ($LASTEXITCODE -ne 0) { Write-Host "Build failed."; exit 1 }

    Write-Host "2. Tagging image..."
    docker tag "$ImageName`:latest" $FullImageUrl

    Write-Host "3. Pushing to AWS ECR..."
    docker push $FullImageUrl

    if ($LASTEXITCODE -ne 0) { Write-Host "Push failed."; exit 1 }

    Write-Host "4. Updating AWS ECS Service to pull new image..."
    # Note: Assumes ECS service names match the script keys exactly. 
    # In Ephemeral Mode, the service might not exist yet, so we ignore errors here.
    aws ecs update-service --cluster $ClusterName --service $Name --force-new-deployment --region $AwsRegion 2>$null | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   (Note: Service update not required/possible for $Name. Image is now live in ECR.)" -ForegroundColor Gray
    } else {
        Write-Host "   $Name service update triggered!" -ForegroundColor Green
    }
    
    Write-Host "$Name deployment step complete!" -ForegroundColor Green
}

if ($ServiceName -eq "all") {
    foreach ($svc in $Services.GetEnumerator()) {
        Deploy-Service -Name $svc.Name -DockerfilePath $svc.Value
    }
} else {
    if ($Services.ContainsKey($ServiceName)) {
        Deploy-Service -Name $ServiceName -DockerfilePath $Services[$ServiceName]
    } else {
        Write-Host "Invalid service name. Pick one of: api_gateway, user_service, catalog_service, media_service, all" -ForegroundColor Red
    }
}
