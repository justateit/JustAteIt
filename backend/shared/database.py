import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# DATABASE_URL points at Postgres. Local dev: the Supabase stack from
# backend/supabase (postgresql://postgres:postgres@127.0.0.1:54322/postgres).
# Hosted: the Supabase SESSION pooler string — see backend/README.md.
DATABASE_URL = os.getenv("DATABASE_URL")

# Make sure we don't crash if it's not set (for build steps)
if DATABASE_URL:
    # pool_pre_ping revalidates pooled connections that the remote end
    # (e.g. Supavisor) may have dropped; connect_timeout=10 prevents
    # infinite hangs when the database is unreachable.
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        connect_args={"connect_timeout": 10}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None

Base = declarative_base()

def get_db():
    if not SessionLocal:
        raise RuntimeError("DATABASE_URL is not set!")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
