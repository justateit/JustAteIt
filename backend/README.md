# Backend (FastAPI microservices)

Python 3.9 microservices behind a lightweight API gateway, run locally with
Docker Compose.

| Service | Port | Role |
| --- | --- | --- |
| `api_gateway` | 8000 (published) | Routes `/api/v1/*` to the services below |
| `services/user_service` | 8001 | Users and flavor profiles (PostgreSQL) |
| `services/catalog_service` | 8002 | Venues, dishes, reviews (PostgreSQL + Google Places) |
| `services/media_service` | 8003 | Image uploads to S3 |

Health checks: gateway `GET /`, and `GET /users/health`, `GET /catalog/health`,
`GET /media/health` on the respective services.

## Configuration

Copy the example env file and fill in real values:

```bash
cp .env.example .env
```

Key variables (see `.env.example` for the full annotated list):

- `DATABASE_URL` — Postgres connection string (user and catalog services):
  local Supabase stack or hosted session pooler — see "Database (Supabase)".
- `GOOGLE_API_KEY` — Google Places key (catalog venue lookup).
- `S3_BUCKET`, `S3_REGION` — required by the media service; uploads fail with
  a clear `503` naming the missing variable(s) if unset.
- `S3_ENDPOINT_URL` — optional custom S3 endpoint (LocalStack/MinIO).
- `S3_PUBLIC_BASE_URL` — optional public base (e.g. CloudFront) for returned
  media URLs; defaults to the standard S3 URL.

AWS credentials: the media service uses boto3's **default credential chain**.
Do not put static AWS keys in `.env`. On ECS/Fargate the task role is used
automatically; locally, configure the AWS CLI (`aws configure`, `AWS_PROFILE`,
or SSO). Never commit `.env`.

## Run locally

```bash
cd backend
docker compose up --build
```

The gateway is then available at `http://localhost:8000` (e.g.
`GET http://localhost:8000/api/v1/media/health`). Service URLs
(`USER_SERVICE_URL`, `CATALOG_SERVICE_URL`, `MEDIA_SERVICE_URL`) are set to
in-network hostnames by `docker-compose.yml`.

To run a single service without Docker:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r services/media_service/requirements.txt
uvicorn services.media_service.main:app --reload --port 8003
```

(Repeat with the matching `requirements.txt`/module path for other services.)

## Tests

Dependencies are exact-pinned in `requirements-dev.txt`; configuration lives
in `pytest.ini`. Tests run fully in-process — no database, S3, or network.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Coverage: health endpoints for all four services (`tests/test_health_endpoints.py`),
media service configuration, S3 client construction, URL building, and
upload content-type behavior (`tests/test_media_service.py`), and schema/seed
invariants for the Supabase migration (`tests/test_schema_invariants.py` —
static analysis only, no database needed).

## Database (Supabase)

The schema's **source of truth** is the versioned migrations in
`supabase/migrations/` (the old `schema.sql` + `init_db.py` flow is gone).
Deterministic, PII-free dev fixtures live in `supabase/seed.sql`. Run all
`supabase` commands from `backend/`.

### Local development

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development),
then:

```bash
cd backend
supabase start    # boots local Postgres + Studio, applies migrations
supabase db reset # wipe + re-apply all migrations, then seed.sql
supabase stop     # shut down (add --no-backup to discard data)
```

Local connection string (put in `.env` as `DATABASE_URL`):

```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Studio (table editor / SQL console) runs at `http://127.0.0.1:54323`.

Note: the Supabase stack runs on the *host*, so services inside
`docker compose` can't reach it via `127.0.0.1` — use
`postgresql://postgres:postgres@host.docker.internal:54322/postgres`
in `.env` when running the stack through compose (Docker Desktop).

### Changing the schema

```bash
supabase migration new <short_name>   # creates supabase/migrations/<timestamp>_<short_name>.sql
# edit the generated file, then:
supabase db reset                     # verify it applies cleanly + reseeds
pytest tests/test_schema_invariants.py
```

Never edit an already-committed migration; add a new one. Keep the
SQLAlchemy models in `services/*/db/models.py` in sync — the invariant
tests fail if a model column is missing from the migrations.

Seed rules (also enforced by tests): fixed literal ids/timestamps only
(no `now()`/`gen_random_uuid()`), and synthetic data only — never real
Clerk ids, emails, names, or places.

### Hosted Supabase (staging/production)

Two different connection paths — don't mix them up:

- **Runtime (services)** — use the **session pooler** (Supavisor session
  mode, port `5432`). Long-lived SQLAlchemy connection pools require
  session mode (transaction mode on `6543` breaks prepared statements
  and session state), and the pooler host is reachable from IPv4-only
  networks:

  ```
  DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
  ```

- **Migrations/DDL** — never through the pooler. Push over the **direct
  connection** (`db.<project-ref>.supabase.co:5432`):

  ```bash
  supabase link --project-ref <project-ref>
  supabase db push          # applies pending supabase/migrations/*
  ```

  (`supabase db push --db-url postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
  works without linking.)

Both strings come from the dashboard's **Connect** panel. The seed file
is for local development only — `db push` never runs it.
