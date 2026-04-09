FROM python:3.9-slim

WORKDIR /app
ENV PYTHONPATH=/app

COPY services/catalog_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic
COPY services/catalog_service/ ./services/catalog_service/
COPY shared/ ./shared/

EXPOSE 8002

CMD ["uvicorn", "services.catalog_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
