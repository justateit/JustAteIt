"""
Populates the database with realistic multi-cuisine dishes, venues, users, and reviews
using the SQL file `populate_db.sql`.
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not set in backend/.env")
    sys.exit(1)

print(f"Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    sql_path = os.path.join(os.path.dirname(__file__), "populate_db.sql")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    with engine.begin() as conn:
        # Split on statements by semicolon followed by newline
        statements = [stmt.strip() for stmt in sql_content.split(";\n") if stmt.strip()]
        for stmt in statements:
            if stmt.startswith("--"):
                continue
            conn.execute(text(stmt))
    print("SUCCESS: Database populated with test entries!")
except Exception as e:
    print(f"ERROR: Failed to populate database: {e}")
    sys.exit(1)

