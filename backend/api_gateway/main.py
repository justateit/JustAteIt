import os
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="JustAteIt API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs mapped from docker-compose.yml
ROUTES = {
    "users": os.getenv("USER_SERVICE_URL", "http://localhost:8001"),
    "catalog": os.getenv("CATALOG_SERVICE_URL", "http://localhost:8002"),
    "media": os.getenv("MEDIA_SERVICE_URL", "http://localhost:8003"),
}

async def proxy_request(service_url: str, path: str, request: Request):
    """Forwards the request to the target microservice."""
    url = f"{service_url}/{path}"
    
    # We increase the timeout to 60 seconds for large photo uploads
    timeout = httpx.Timeout(60.0, connect=10.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
             # Gather headers and remove host to prevent mismatches
             headers = dict(request.headers)
             headers.pop("host", None)
             headers.pop("content-length", None) # Let httpx recalculate for safety

             # Forward the request using the raw body, bypassing chunked encoding bugs
             body = await request.body()
             response = await client.request(
                 method=request.method,
                 url=url,
                 headers=headers,
                 content=body,
                 params=request.query_params
             )
             
             return JSONResponse(
                 status_code=response.status_code, 
                 content=response.json() if response.content else {"message": "Empty response"}
             )
        except httpx.TimeoutException:
             print(f"TIMEOUT: {request.method} {url} timed out after 60s")
             raise HTTPException(status_code=504, detail="Gateway Timeout")
        except Exception as exc:
             print(f"Proxy error to {url}: {exc}")
             raise HTTPException(status_code=503, detail=f"Service Unavailable: {str(exc)}")

# -- API Routing rules --

@app.api_route("/api/v1/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_users(path: str, request: Request):
    return await proxy_request(ROUTES["users"], f"users/{path}", request)

@app.api_route("/api/v1/flavor-profiles/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_flavor_profiles(path: str, request: Request):
    # Route flavor profiles to the user microservice
    return await proxy_request(ROUTES["users"], f"flavor-profiles/{path}", request)

@app.api_route("/api/v1/reviews/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_reviews(path: str, request: Request):
    return await proxy_request(ROUTES["catalog"], f"reviews/{path}", request)

@app.api_route("/api/v1/venues/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_venues(path: str, request: Request):
    return await proxy_request(ROUTES["catalog"], f"venues/{path}", request)

@app.api_route("/api/v1/media/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def route_media(path: str, request: Request):
    return await proxy_request(ROUTES["media"], f"media/{path}", request)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "API Gateway"}
