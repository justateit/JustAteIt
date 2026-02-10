import boto3
import uuid
import os
from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from botocore.exceptions import ClientError, NoCredentialsError
from contextlib import asynccontextmanager

load_dotenv(override=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*50)
    print("DEBUG: Attempting to connect to S3...")
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
        print(f"SUCCESS: Connected to S3. Bucket '{S3_BUCKET}' is accessible.")
    except ClientError as e:
        print(f"ERROR: S3 Client Error. Code: {e.response['Error']['Code']}")
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
    print("="*50 + "\n")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION")

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=S3_REGION
)

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # print this immediately to see if the request even reaches the function
    print(f"\n>>> INCOMING REQUEST: {file.filename} ({file.content_type})")
    
    if file.content_type not in ["image/webp", "image/jpeg", "image/png"]:
        print(f">>> REJECTED: {file.content_type} is not a valid format.")
        raise HTTPException(status_code=400, detail="Invalid file type")

    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"

    # We are REMOVING the try/except block temporarily.
    # This forces the terminal to show the EXACT line and error if it fails.
    
    print(f">>> STARTING S3 UPLOAD: {unique_filename}")
    
    # 1. Rewind the file
    await file.seek(0)
    
    # 2. Attempt the upload
    s3_client.upload_fileobj(
        file.file,
        S3_BUCKET,
        unique_filename,
        ExtraArgs={"ContentType": file.content_type}
    )

    s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{unique_filename}"
    print(f">>> SUCCESS! URL: {s3_url}\n")
    
    return {"url": s3_url}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)