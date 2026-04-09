param (
    [Parameter(Mandatory=$false)]
    [int]$LifespanMinutes = 10,
    
    [Parameter(Mandatory=$true)]
    [string]$SubnetId,
    
    [Parameter(Mandatory=$true)]
    [string]$SecurityGroupId,

    [Parameter(Mandatory=$false)]
    [switch]$Tunnel
)

$ClusterName = "justateit-prod-cluster"
$TaskFamily = "justateit-backend-task"

Write-Host "Launching an Ephemeral Fargate Task for $LifespanMinutes minutes..." -ForegroundColor Cyan

# 1. Start a standalone task (Bypassing the expensive 'Service' and 'Load Balancer' completely)
$TaskJson = aws ecs run-task `
    --cluster $ClusterName `
    --region us-east-2 `
    --task-definition $TaskFamily `
    --launch-type FARGATE `
    --network-configuration "awsvpcConfiguration={subnets=[$SubnetId],securityGroups=[$SecurityGroupId],assignPublicIp=ENABLED}" | ConvertFrom-Json

$TaskArn = $TaskJson.tasks[0].taskArn

if (-not $TaskArn) {
    Write-Host "Failed to launch task. Check your AWS permissions." -ForegroundColor Red
    exit 1
}

Write-Host "Task spinning up. Waiting for AWS to provision a Public IP (can take up to 60 seconds)..."

# 2. Fetch the Public IP address attached to this task using a retry loop
$PublicIp = $null
$Attempts = 0
while ($true) {
    Start-Sleep -Seconds 5
    $Attempts++
    
    $TaskDetails = aws ecs describe-tasks --cluster $ClusterName --tasks $TaskArn --region us-east-2 | ConvertFrom-Json
    $LastStatus = $TaskDetails.tasks[0].lastStatus
    $StoppedReason = $TaskDetails.tasks[0].stoppedReason

    if ($LastStatus -eq "STOPPED") {
        Write-Host "FATAL EROR: AWS instantly killed your container on boot." -ForegroundColor Red
        Write-Host "AWS Failure Reason: $StoppedReason" -ForegroundColor Yellow
        exit 1
    }

    $EniId = $TaskDetails.tasks[0].attachments[0].details | Where-Object { $_.name -eq "networkInterfaceId" } | Select-Object -ExpandProperty value

    if ($EniId) {
        $RawJson = aws ec2 describe-network-interfaces --network-interface-ids $EniId --region us-east-2 --output json | ConvertFrom-Json
        
        # Traverse the nested object safely
        $Interface = $RawJson.NetworkInterfaces
        if ($Interface -is [array]) { $Interface = $Interface[0] }
        
        $PublicIpValue = $Interface.Association.PublicIp

        if (-not [string]::IsNullOrWhiteSpace($PublicIpValue)) {
            $PublicIp = $PublicIpValue
            break
        }
    }

    if ($Attempts -gt 15) {
        Write-Host "Timed out waiting for Public IP." -ForegroundColor Red
        aws ecs stop-task --cluster $ClusterName --task $TaskArn --region us-east-2 | Out-Null
        exit 1
    }
}

Write-Host "TASK IS LIVE!" -ForegroundColor Green
Write-Host "Your API Gateway is accessible at: http://$PublicIp:8000" -ForegroundColor Yellow

# 3. AUTO-SYNC: Update the frontend .env file automatically
$FrontendEnv = Join-Path (Get-Item -Path $PSScriptRoot).Parent.FullName "frontend\.env"
if (Test-Path $FrontendEnv) {
    Write-Host "Auto-syncing IP to frontend .env..." -ForegroundColor Gray
    $Content = Get-Content $FrontendEnv
    $NewContent = $Content -replace 'EXPO_PUBLIC_API_URL=http://[^:]+:8000', "EXPO_PUBLIC_API_URL=http://$($PublicIp):8000" `
                           -replace 'EXPO_PUBLIC_FLAVOR_API_URL=http://[^:]+:8000', "EXPO_PUBLIC_FLAVOR_API_URL=http://$($PublicIp):8000"
    $NewContent | Set-Content $FrontendEnv
    Write-Host "Frontend .env updated successfully!" -ForegroundColor Green

    # 4. AUTO-START: Launch Expo automatically in a new window
    $FrontendDir = Join-Path (Get-Item -Path $PSScriptRoot).Parent.FullName "frontend"
    if (Test-Path $FrontendDir) {
        $ExpoCmd = if ($Tunnel) { "npx expo start --tunnel" } else { "npx expo start" }
        Write-Host "Launching Expo Metro Bundler (Mode: $(if ($Tunnel) { "Tunnel" } else { "LAN" })) in a new window..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$FrontendDir`"; $ExpoCmd"
    }
} else {
    Write-Host "Could not find frontend .env at $FrontendEnv. Please update manually." -ForegroundColor Red
}

# 3. Wait out the timer
Write-Host "Timer started. The task will self-destruct in $LifespanMinutes minutes..." -ForegroundColor Red
$SecondsLeft = $LifespanMinutes * 60
while ($SecondsLeft -gt 0) {
    Start-Sleep -Seconds 60
    $SecondsLeft -= 60
    Write-Host "$($SecondsLeft/60) minutes remaining before auto-kill..."
}

# 4. Terminate the task to stop billing
Write-Host "Time is up. Sending kill signal to AWS Fargate..." -ForegroundColor Red
aws ecs stop-task --cluster $ClusterName --task $TaskArn --region us-east-2 | Out-Null
Write-Host "Task destroyed. Billing has stopped." -ForegroundColor Green
