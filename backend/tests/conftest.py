import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

_test_database_url = os.getenv("TEST_DATABASE_URL", "").strip()
_safety_message = "Tests require the isolated postgres-test/mathsim_test database. Use the Compose test profile."
try:
    _test_url = make_url(_test_database_url)
except ArgumentError:
    raise pytest.UsageError(_safety_message) from None

# Validate before importing the application or opening any connection.
if (
    _test_url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
    or _test_url.host != "postgres-test"
    or _test_url.port not in (None, 5432)
    or _test_url.username != "mathsim_test"
    or _test_url.database != "mathsim_test"
):
    raise pytest.UsageError(_safety_message)
os.environ["DATABASE_URL"] = _test_database_url

from main import app
from database import engine, Base, SessionLocal


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
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
