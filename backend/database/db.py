import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Explicitly load .env from the backend root
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print(f"[DB ERROR] DATABASE_URL empty in env! Path checked: {env_path}")
    DATABASE_URL = "sqlite:///./verbo.db"
else:
    print(f"[DB CONNECT] Using cloud database: {DATABASE_URL[:15]}...")

# Create engine
# For PostgreSQL on Supabase, we might need some connection pooling tweaks
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
