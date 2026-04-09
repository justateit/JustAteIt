# Just Ate It 🍴

JustAteIt is a production-grade, microservices-powered food tracking application. It features an **Expo (React Native)** frontend and a **Python FastAPI** backend architecture deployed on **AWS ECS Fargate**.

## 🏗️ Architecture Overhaul

The project has transitioned from a monolithic local setup to a modern, cloud-native microservices stack:

- **Mobile Frontend**: React Native (Expo) featuring Clerk Authentication.
- **Microservices (FastAPI)**:
  - `api_gateway`: The unified entry point with 60s timeouts and robust proxying.
  - `user_service`: Manages flavor profiles and user metadata.
  - `catalog_service`: Manages reviews, venues (via Google Places API), and dishes.
  - `media_service`: Handshakes with AWS S3 for secure image storage.
- **Infrastructure**:
  - **AWS ECS (Elastic Container Service)**: Orchestrates the containerized microservices lifecycle, managing task definitions and cluster scheduling.
  - **AWS Fargate**: Serverless compute engine used to execute containers without managing underlying EC2 instances.
  - **AWS ECR (Elastic Container Registry)**: Private Docker registry for hosting, versioning, and deploying service images.
  - **AWS RDS (Postgres)**: Persistent RDBMS for relational data storage and flavor profile persistence.
  - **AWS S3**: Scalable object storage for high-resolution food photo media.
  - **AWS VPC (Virtual Private Cloud)**: Provides an isolated network environment with custom subnets and security groups to secure cross-service traffic.
  - **CloudWatch**: Centralized logging aggregate for all microservice streams via `awslogs`.

---

## 🚀 Cloud Deployment Workflow

To deploy the backend to AWS, follow these steps in the `backend/` directory:

### 1. Synchronize Environment Variables
Sync your local `.env` keys (S3, RDS, AWS) to the AWS Task Definition blueprint:
```powershell
python inject_env.py
```

### 2. Build & Push Images
Compile the Docker containers and push them to AWS ECR:
```powershell
# For all services
.\deploy.ps1 -AwsAccountId YOUR_ACCOUNT_ID

# For a specific service (e.g., api_gateway)
.\deploy.ps1 -AwsAccountId YOUR_ACCOUNT_ID -ServiceName "api_gateway"
```

### 3. Launch Ephemeral Stack
Start the serverless Fargate task. This will provide you with a live Public IP address:
```powershell
.\run_ephemeral_cloud.ps1 -SubnetId "YOUR_SUBNET" -SecurityGroupId "YOUR_SG" -LifespanMinutes 10
```

---

## 🛠️ Critical Commands

### 🔍 Find the Live Public IP
If you lose your terminal output, run this to find the IP for your `frontend/.env`:
```powershell
(aws ec2 describe-network-interfaces --region us-east-2 | ConvertFrom-Json).NetworkInterfaces | Where-Object { $_.Association.PublicIp } | ForEach-Object { Write-Host "✅ Live IP Found: http://$($_.Association.PublicIp):8000" -ForegroundColor Green }
```
> [!NOTE]
> Usually, the API will be the IP address that is **NOT** the fixed RDS database IP.

### 🛑 Emergency Stop (Stop Billing)
To manually kill all running cloud clusters and stop AWS billing immediately:
```powershell
aws ecs list-tasks --cluster justateit-prod-cluster --region us-east-2 | ConvertFrom-Json | Select-Object -ExpandProperty taskArns | ForEach-Object { aws ecs stop-task --cluster justateit-prod-cluster --task $_ --region us-east-2 | Out-Null }
```

### 📱 Frontend Connection
Update `frontend/.env` with the live Gateway IP:
```env
EXPO_PUBLIC_API_URL=http://<LIVE_IP>:8000
```
Then restart Expo:
```bash
npx expo start
```

---

## 🛡️ Security & Performance
- **Timeouts**: The API Gateway is configured with a **60s** timeout to support high-res photo uploads.
- **Logging**: All services use Revision 3 with **Universal Logging** enabled (`awslogs`).
