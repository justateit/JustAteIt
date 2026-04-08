FROM python:3.9-slim

WORKDIR /app

COPY services/user_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic
COPY services/user_service/ ./services/user_service/
COPY shared/ ./shared/

EXPOSE 8001

CMD ["uvicorn", "services.user_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
