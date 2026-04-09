import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# 1. Load the .env file from the current directory
load_dotenv()

# 2. Grab the DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in .env file.")
    exit(1)

# 3. Create the SQLAlchemy engine
# pool_pre_ping=True helps check if the remote connection is still alive
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def inspect_db():
    print("📡 Connecting to JustAteIt RDS...")
    try:
        with engine.connect() as conn:
            # Check Reviews
            print("\n--- 📝 LATEST REVIEWS ---")
            reviews = conn.execute(text("""
                SELECT r.id, d.name as dish, v.name as venue, r.rating, r.created_at 
                FROM reviews r
                LEFT JOIN dishes d ON r.dish_id = d.id
                LEFT JOIN venues v ON r.venue_id = v.id
                ORDER BY r.created_at DESC 
                LIMIT 5
            """))
            for r in reviews:
                print(f"[{r.created_at}] {r.dish} at {r.venue} | Rating: {r.rating}")

            # Check Venues (Lazy Creation Verification)
            print("\n--- 📍 RECENT VENUES ---")
            venues = conn.execute(text("SELECT name, vicinity FROM venues ORDER BY id DESC LIMIT 5"))
            for v in venues:
                print(f"{v.name} ({v.vicinity})")

            # Check Media Links
            print("\n--- 🖼️ RECENT IMAGE LINKS ---")
            media = conn.execute(text("SELECT media_url FROM media ORDER BY id DESC LIMIT 3"))
            for m in media:
                print(f"Image: {m.media_url[:80]}...")

    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")

if __name__ == "__main__":
    inspect_db()
