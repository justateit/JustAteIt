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
    print("S3 Microservice Booting...")
    try:
        if S3_BUCKET:
            s3_client.head_bucket(Bucket=S3_BUCKET)
            print(f"SUCCESS: Connected to S3. Bucket '{S3_BUCKET}' is accessible.")
        else:
            print("WARNING: S3_BUCKET env var not set.")
    except Exception as e:
        print(f"ERROR: S3 Connection failed: {e}")
    yield

app = FastAPI(title="Media Service", lifespan=lifespan)

@app.post("/media/upload")
async def upload_media(file: UploadFile = File(...)):
    if file.content_type not in ["image/webp", "image/jpeg", "image/png", "image/jpg"]:
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

        # Note: Writing to the RDS 'media' table should either happen here,
        # or be returned to the Gateway to orchestrate. Returning URL for now.
        return {
            "success": True,
            "url": s3_url,
            "type": file.content_type
        }

    except Exception as e:
        print(f"S3 UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image.")

@app.get("/media/health")
def health_check():
    return {"status": "ok", "service": "media_service"}
