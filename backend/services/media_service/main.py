import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import boto3
from fastapi import FastAPI, File, HTTPException, UploadFile

ALLOWED_CONTENT_TYPES = ("image/webp", "image/jpeg", "image/png", "image/jpg")


class MediaConfigurationError(RuntimeError):
    """Raised when required S3 configuration is missing."""


def get_s3_config() -> dict:
    """Read S3 configuration from the environment at call time.

    Required:
        S3_BUCKET           target bucket for uploads
        S3_REGION           AWS region of the bucket

    Optional:
        S3_ENDPOINT_URL     custom S3 endpoint (e.g. LocalStack/MinIO)
        S3_PUBLIC_BASE_URL  public base URL for returned object URLs
                            (e.g. a CloudFront distribution)

    Raises MediaConfigurationError naming the missing variables so
    misconfiguration is obvious instead of surfacing as an opaque boto3
    error at upload time.
    """
    bucket = os.getenv("S3_BUCKET")
    region = os.getenv("S3_REGION")
    missing = [
        name
        for name, value in (("S3_BUCKET", bucket), ("S3_REGION", region))
        if not value
    ]
    if missing:
        raise MediaConfigurationError(
            "Media service is not configured: missing required environment "
            "variable(s): " + ", ".join(missing)
        )
    return {
        "bucket": bucket,
        "region": region,
        "endpoint_url": os.getenv("S3_ENDPOINT_URL") or None,
        "public_base_url": os.getenv("S3_PUBLIC_BASE_URL") or None,
    }


def get_s3_client(config: Optional[dict] = None):
    """Build an S3 client using boto3's default credential chain.

    No static credentials are passed. On ECS/Fargate boto3 resolves the
    task role via the container credentials provider; locally it falls
    back to the standard chain (env vars, shared config, SSO, etc.).
    """
    if config is None:
        config = get_s3_config()
    client_kwargs = {"region_name": config["region"]}
    if config["endpoint_url"]:
        client_kwargs["endpoint_url"] = config["endpoint_url"]
    return boto3.client("s3", **client_kwargs)


def build_public_url(config: dict, object_key: str) -> str:
    """Return the public URL for an uploaded object.

    Uses S3_PUBLIC_BASE_URL when set (trailing slash tolerated), otherwise
    the standard virtual-hosted S3 URL.
    """
    if config["public_base_url"]:
        return f"{config['public_base_url'].rstrip('/')}/{object_key}"
    return (
        f"https://{config['bucket']}.s3.{config['region']}.amazonaws.com/"
        f"{object_key}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\033[96m[MEDIA] S3 Microservice Booting...\033[0m")
    try:
        config = get_s3_config()
    except MediaConfigurationError as exc:
        print(f"\033[91m[MEDIA ERROR] {exc}\033[0m")
    else:
        try:
            get_s3_client(config).head_bucket(Bucket=config["bucket"])
            print(
                f"\033[92m[MEDIA] SUCCESS: Connected to S3 Bucket "
                f"'{config['bucket']}'\033[0m"
            )
        except Exception as exc:
            print(f"\033[91m[MEDIA ERROR] S3 Connection failed: {exc}\033[0m")
    yield


app = FastAPI(title="Media Service", lifespan=lifespan)


@app.post("/media/upload")
async def upload_media(file: UploadFile = File(...)):
    print(
        f"\033[96m[MEDIA] Receiving upload: {file.filename} "
        f"({file.content_type})\033[0m"
    )
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        print(
            f"\033[93m[MEDIA] Rejected invalid content type: "
            f"{file.content_type}\033[0m"
        )
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        config = get_s3_config()
    except MediaConfigurationError as exc:
        print(f"\033[91m[MEDIA ERROR] {exc}\033[0m")
        raise HTTPException(status_code=503, detail=str(exc))

    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"

    try:
        await file.seek(0)
        get_s3_client(config).upload_fileobj(
            file.file,
            config["bucket"],
            unique_filename,
            ExtraArgs={"ContentType": file.content_type},
        )
        s3_url = build_public_url(config, unique_filename)
        print(f"\033[92m[MEDIA] Upload successful: {unique_filename}\033[0m")

        return {
            "success": True,
            "url": s3_url,
            "type": file.content_type,
        }

    except Exception as exc:
        print(f"\033[91m[MEDIA ERROR] S3 UPLOAD FAILURE: {exc}\033[0m")
        raise HTTPException(status_code=500, detail="Failed to upload image.")


@app.get("/media/health")
def health_check():
    return {"status": "ok", "service": "media_service"}
