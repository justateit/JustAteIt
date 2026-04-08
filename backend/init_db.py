import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We expect DATABASE_URL to look like:
# postgresql://postgres:YOUR_PASSWORD@justateit-db.cwxxxxx.us-east-1.rds.amazonaws.com:5432/justateit
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL is missing in your .env file.")
    print("Example: DATABASE_URL=postgresql://postgres:password123@your-rds-endpoint.com:5432/justateit")
    exit(1)

def init_db():
    try:
        print("Connecting to AWS RDS...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True  # Required for some commands like CREATE EXTENSION
        cursor = conn.cursor()

        print("Reading schema.sql...")
        with open("schema.sql", "r") as file:
            sql_script = file.read()

        print("Executing schema setup. This might take a few seconds...")
        cursor.execute(sql_script)

        print("✅ Success! The RDS Database schema has been initialized.")

    except Exception as e:
        print(f"❌ Failed to run schema: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    init_db()
