import os
import boto3
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from contextlib import asynccontextmanager

S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION")

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=S3_REGION
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\033[96m[MEDIA] S3 Microservice Booting...\033[0m")
    try:
        if S3_BUCKET:
            s3_client.head_bucket(Bucket=S3_BUCKET)
            print(f"\033[92m[MEDIA] SUCCESS: Connected to S3 Bucket '{S3_BUCKET}'\033[0m")
        else:
            print("\033[93m[MEDIA] WARNING: S3_BUCKET env var not set.\033[0m")
    except Exception as e:
        print(f"\033[91m[MEDIA ERROR] S3 Connection failed: {e}\033[0m")
    yield

app = FastAPI(title="Media Service", lifespan=lifespan)

@app.post("/media/upload")
async def upload_media(file: UploadFile = File(...)):
    print(f"\033[96m[MEDIA] Receiving upload: {file.filename} ({file.content_type})\033[0m")
    if file.content_type not in ["image/webp", "image/jpeg", "image/png", "image/jpg"]:
        print(f"\033[93m[MEDIA] Rejected invalid content type: {file.content_type}\033[0m")
        raise HTTPException(status_code=400, detail="Invalid file type")

    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"

    try:
        await file.seek(0)
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{unique_filename}"
        print(f"\033[92m[MEDIA] Upload successful: {unique_filename}\033[0m")

        return {
            "success": True,
            "url": s3_url,
            "type": file.content_type
        }

    except Exception as e:
        print(f"\033[91m[MEDIA ERROR] S3 UPLOAD FAILURE: {e}\033[0m")
        raise HTTPException(status_code=500, detail="Failed to upload image.")

@app.get("/media/health")
def health_check():
    return {"status": "ok", "service": "media_service"}
