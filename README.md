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
- **Infrastructure** (defined in `infra/cloudformation/dev-backend.yml`):
  - **AWS ECS (Elastic Container Service) + Fargate**: Runs all four services as one serverless task launched on demand.
  - **AWS ECR (Elastic Container Registry)**: Private Docker registry with immutable, git-SHA-tagged images.
  - **Supabase (Postgres)**: Hosted database; the connection string is delivered to the task via **SSM Parameter Store**.
  - **AWS S3**: Object storage for food photo media.
  - **AWS VPC**: Minimal public-subnet network (no NAT/ALB) with a security group restricting ingress to your IP.
  - **CloudWatch**: Centralized logging for all microservice streams via `awslogs`.

---

## 🚀 Cloud Deployment Workflow (dev)

All AWS resources are provisioned by CloudFormation; the old `deploy.ps1`,
`run_ephemeral_cloud.ps1`, and `inject_env.*` scripts are replaced by the
scripts in `infra/scripts/`. Full details: [`infra/README.md`](infra/README.md).

```powershell
cd infra\scripts

# 1. Provision/update the stack (ECR, VPC, S3, ECS, IAM, task definition)
.\deploy-stack.ps1 -AllowedIngressCidr "<your-ip>/32" `
    -DatabaseUrlParameterArn "arn:aws:ssm:us-east-2:<account>:parameter/justateit/dev/database-url"

# 2. Build and push all four images, tagged with the current git SHA
.\build-push-images.ps1

# 3. Launch one ephemeral Fargate task; syncs frontend/.env.local to its
#    public IP, waits out the lifespan, then stops that task (also on Ctrl+C)
.\run-dev-task.ps1 -LifespanMinutes 15
```

---

## 🌐 Web Hosting (optional)

The Expo web build can be served from a **private S3 bucket behind CloudFront**
(Origin Access Control, default `*.cloudfront.net` domain — no custom domain).
Template: [`infra/cloudformation/web-hosting.yml`](infra/cloudformation/web-hosting.yml).

```powershell
# One-time: create the hosting stack (no parameters)
aws cloudformation deploy --region us-east-2 --stack-name justateit-web `
    --template-file infra\cloudformation\web-hosting.yml

# Build and publish (syncs frontend/dist, invalidates the CloudFront cache)
cd frontend ; npm run build:web
cd ..\infra\scripts ; .\deploy-web.ps1
```

Native app releases use **EAS** with the profiles in `frontend/eas.json`
(`development`, `preview`, `production`) — see
[`frontend/README.md`](frontend/README.md) for EAS vs web deployment details.

## 🧪 Development Commands & CI

```powershell
# Backend tests
cd backend
python -m venv .venv ; .venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\pytest

# Frontend
cd frontend
npm run lint        # ESLint
npm run build:web   # static web export -> frontend/dist

# Infrastructure templates
cfn-lint infra/cloudformation/*.yml
```

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs
the same checks on every pull request: backend pytest, frontend lint, Expo
web export, and cfn-lint. CI holds **no AWS credentials** and does not
deploy; if automated deployment is added later, use GitHub's **AWS OIDC
federation** (`aws-actions/configure-aws-credentials` with `role-to-assume`)
rather than embedding access keys in repository secrets.

## 🛡️ Security & Performance
- **Timeouts**: The API Gateway is configured with a **60s** timeout to support high-res photo uploads.
- **Logging**: All containers stream to a CloudWatch log group (7-day retention) via `awslogs`.
- **Secrets**: `DATABASE_URL` lives in SSM Parameter Store and is injected at container launch — never baked into images or templates.
