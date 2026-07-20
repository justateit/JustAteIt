# Infrastructure (dev backend on AWS)

Everything is one CloudFormation template — `cloudformation/dev-backend.yml` —
plus three PowerShell scripts. This replaces the old hand-managed setup and
scripts (`backend/deploy.ps1`, `backend/run_ephemeral_cloud.ps1`,
`backend/inject_env.*`), which are gone.

What the stack creates:

- 4 ECR repos (immutable tags), one per service
- Minimal VPC: one public subnet + internet gateway route — **no NAT** (cost)
- S3 media bucket — **objects are publicly readable** so the app can render
  uploaded photos (dev-only tradeoff; keys are random UUIDs)
- ECS cluster, CloudWatch log group (7-day retention), task execution/task
  IAM roles (ECR pull, logs, media-bucket S3 access, SSM parameter read)
- One Fargate task definition running all four containers; they share the
  task's network namespace and talk over `localhost:8001–8003`, with only
  the gateway (`:8000`) exposed

Deliberately **not** included (dev harness, not production): ALB, ECS
service/autoscaling, RDS/NAT, custom domain, HTTPS. The database is hosted
Supabase (see `backend/README.md`); `GOOGLE_API_KEY` is not wired in — venue
lookup degrades gracefully without it.

## Prerequisites

- AWS CLI v2 with credentials configured, Docker, PowerShell 5.1+ or 7, git
- A **lowercase** stack name (default `justateit-dev`) — it prefixes ECR
  repo names
- One-time: put the Supabase **session pooler** connection string in SSM
  (same region as the stack):

  ```powershell
  aws ssm put-parameter --region us-east-2 `
      --name /justateit/dev/database-url --type SecureString `
      --value "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
  ```

  The connection string never appears in the template or task definition —
  ECS resolves it at container launch.

## Workflow

From `infra/scripts/`:

```powershell
# 1. Create/update the stack (first run creates the ECR repos).
.\deploy-stack.ps1 -AllowedIngressCidr "<your-ip>/32" `
    -DatabaseUrlParameterArn "arn:aws:ssm:us-east-2:<account>:parameter/justateit/dev/database-url"

# 2. Build and push all four images, tagged with the current git SHA.
.\build-push-images.ps1

# 3. Launch one ephemeral task; writes frontend/.env.local with the task's
#    public IP, waits, then stops that task (also on Ctrl+C).
.\run-dev-task.ps1 -LifespanMinutes 15
```

Both `deploy-stack.ps1` and `build-push-images.ps1` default the image tag to
the current git SHA, so run them on the same commit. After code changes:
commit, `build-push-images.ps1`, `deploy-stack.ps1` (updates the task
definition to the new tag), `run-dev-task.ps1`.

## Cost

Nothing in the stack bills while idle except pennies for ECR/S3 storage and
logs. Fargate (0.5 vCPU / 2 GB) bills only while `run-dev-task.ps1` has a
task running; the script always stops its task in a `finally` block. There
is no NAT gateway or ALB (the usual always-on costs).

## Teardown

```powershell
aws cloudformation delete-stack --region us-east-2 --stack-name justateit-dev
```

ECR repos delete automatically even with images (`EmptyOnDelete`). Empty the
media bucket first if it has objects:
`aws s3 rm s3://<MediaBucketName-output> --recursive`.
