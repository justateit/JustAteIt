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

- `DATABASE_URL` — PostgreSQL connection string (user and catalog services).
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

Coverage: health endpoints for all four services (`tests/test_health_endpoints.py`)
and media service configuration, S3 client construction, URL building, and
upload content-type behavior (`tests/test_media_service.py`).

## Database schema

`schema.sql` contains the PostgreSQL schema; `init_db.py` applies it using
`DATABASE_URL`.
