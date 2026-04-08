FROM python:3.9-slim

WORKDIR /app

COPY services/media_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic
COPY services/media_service/ ./services/media_service/
# Allow importing shared modules
COPY shared/ ./shared/

EXPOSE 8003

# Run Uvicorn
CMD ["uvicorn", "services.media_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
