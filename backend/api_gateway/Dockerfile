FROM python:3.9-slim

WORKDIR /app

COPY api_gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy gateway logic
COPY api_gateway/ ./api_gateway/

EXPOSE 8000

# Run Uvicorn
CMD ["uvicorn", "api_gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
