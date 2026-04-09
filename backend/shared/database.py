import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load the same DATABASE_URL we set up for the scripts
DATABASE_URL = os.getenv("DATABASE_URL")

# Make sure we don't crash if it's not set (for build steps)
if DATABASE_URL:
    # We want pool_pre_ping to check if the RDS connection dropped
    # connect_timeout=10 prevents infinite hangs if RDS is blocked by firewall
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
