import os
import tempfile
import pytest
from fastapi.testclient import TestClient

_db_file = os.path.join(tempfile.gettempdir(), "toolgrile_test.db")

os.environ["DATABASE_PATH"] = _db_file
os.environ["PROCESSED_DATA_PATH"] = "/nonexistent"

from main import app
from database import engine, Base, SessionLocal


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    client.post("/api/register", json={"username": "testuser", "password": "pass123"})
    response = client.post("/api/login", json={"username": "testuser", "password": "pass123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client):
    import bcrypt
    from models import User
    db = SessionLocal()
    hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    user = User(username="admin", password=hashed, role="admin")
    db.add(user)
    db.commit()
    db.close()

    response = client.post("/api/login", json={"username": "admin", "password": "admin123"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
