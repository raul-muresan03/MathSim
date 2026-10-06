import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required. Configure a PostgreSQL connection URL.")

SQLALCHEMY_DATABASE_URL = make_url(DATABASE_URL)
if SQLALCHEMY_DATABASE_URL.drivername not in ("postgres", "postgresql", "postgresql+psycopg"):
    raise ValueError("DATABASE_URL must use PostgreSQL with psycopg.")
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.set(drivername="postgresql+psycopg")

# Neon/PgBouncer handles pooling; do not retain connections in idle functions.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
    connect_args={"prepare_threshold": None},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
