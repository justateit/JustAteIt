import boto3
import uuid
import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from botocore.exceptions import ClientError
from contextlib import asynccontextmanager

# 1. Load Environment Variables
load_dotenv(override=True)

S3_BUCKET = os.getenv("S3_BUCKET")
S3_REGION = os.getenv("S3_REGION")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# 2. S3 Client Setup
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=S3_REGION
)

# 3. Google Places Logic
def get_nearby_restaurant(lat: str, lon: str):
    """Hits Google Places API to find the closest restaurant."""
    if not GOOGLE_API_KEY:
        print(">>> ERROR: GOOGLE_API_KEY not found in .env")
        return None, None

    try:
        # Search radius of 50 meters for 'restaurant' types
        url = (
            f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            f"?location={lat},{lon}&radius=50&type=restaurant&key={GOOGLE_API_KEY}"
        )
        response = requests.get(url).json()
        print(f">>> Google Places status: {response.get('status')}")
        print(f">>> Results count: {len(response.get('results', []))}")
        print(f">>> Using API key: {GOOGLE_API_KEY[:8]}...")
        
        if response.get("results"):
            # The top result is the most prominent/closest match
            best_match = response["results"][0]
            name = best_match.get("name")
            
            # vicinity usually gives "Street Name, Number" or "Neighborhood"
            vicinity = best_match.get("vicinity", "")
            return name, vicinity
    except Exception as e:
        print(f">>> Google API Failure: {e}")
    
    return None, None

# 4. Lifespan and App Initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*50)
    print("DEBUG: Attempting to connect to S3...")
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
        print(f"SUCCESS: Connected to S3. Bucket '{S3_BUCKET}' is accessible.")
    except Exception as e:
        print(f"ERROR: S3 Connection failed: {e}")
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

# 5. The Upload Endpoint
@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    latitude: str = Form(None),   # Caught from React Native FormData
    longitude: str = Form(None)   # Caught from React Native FormData
):
    print(f"\n>>> INCOMING REQUEST: {file.filename}")
    print(f">>> COORDS RECEIVED: Lat {latitude}, Lon {longitude}")
    
    if file.content_type not in ["image/webp", "image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"

    try:
        # Upload to S3
        await file.seek(0)
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{unique_filename}"
        
        # Match Restaurant logic
        restaurant_name = None
        location_vicinity = None

        if latitude and longitude:
            print(f">>> Querying Google for restaurant at: {latitude}, {longitude}")
            restaurant_name, location_vicinity = get_nearby_restaurant(latitude, longitude)

        print(f">>> SUCCESS: Restaurant: {restaurant_name if restaurant_name else 'Unknown'}")

        return {
            "url": s3_url,
            "restaurant_name": restaurant_name,
            "location": location_vicinity
        }

    except Exception as e:
        print(f">>> UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)