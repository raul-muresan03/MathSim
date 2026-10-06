import runpy
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

import database


@pytest.mark.parametrize("url", [None, "", "   "])
def test_database_url_is_required(monkeypatch, url):
    if url is None:
        monkeypatch.delenv("DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("DATABASE_URL", url)
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        runpy.run_path(database.__file__)


@pytest.mark.parametrize("url", [
    "sqlite:///:memory:",
    "mysql://student:password@localhost/mathsim",
    "postgresql+psycopg2://student:password@localhost/mathsim",
])
def test_only_postgres_with_psycopg_is_supported(monkeypatch, url):
    monkeypatch.setenv("DATABASE_URL", url)
    with pytest.raises(ValueError, match="PostgreSQL with psycopg"):
        runpy.run_path(database.__file__)


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_url_preserves_credentials_and_ssl(monkeypatch, scheme):
    monkeypatch.setenv(
        "DATABASE_URL",
        f"{scheme}://student:p%40ss@localhost/mathsim?sslmode=require",
    )

    # Creating an engine must not connect to the configured server.
    with patch("sqlalchemy.create_engine", wraps=create_engine) as factory:
        config = runpy.run_path(database.__file__)
    engine = config["engine"]
    try:
        assert engine.url.drivername == "postgresql+psycopg"
        assert engine.url.password == "p@ss"
        assert engine.url.query["sslmode"] == "require"
        assert isinstance(engine.pool, NullPool)
        assert factory.call_args.kwargs["connect_args"] == {"prepare_threshold": None}
    finally:
        engine.dispose()


def test_startup_does_not_create_tables():
    from fastapi.testclient import TestClient
    from main import app

    with patch("database.Base.metadata.create_all") as create_all:
        with TestClient(app) as client:
            assert client.get("/api/health").status_code == 200
        create_all.assert_not_called()


def test_manual_initialization_is_idempotent(db):
    from models import User

    db.add(User(username="schema-check", password="unused-test-hash"))
    db.commit()
    script = Path(database.__file__).with_name("init_db.py")
    runpy.run_path(str(script), run_name="__main__")
    runpy.run_path(str(script), run_name="__main__")
    assert db.query(User).filter(User.username == "schema-check").count() == 1


@pytest.mark.parametrize("url", [
    None,
    "",
    "sqlite:///:memory:",
    "postgresql://mathsim_test:test@neon.invalid/mathsim_test",
    "postgresql://mathsim:test@postgres/mathsim",
    "postgresql://mathsim_test:test@postgres-test/mathsim",
    "postgresql://mathsim_test:test@postgres-test:5433/mathsim_test",
    "postgresql://mathsim:test@postgres-test/mathsim_test",
])
def test_unsafe_test_database_is_rejected_before_import(monkeypatch, url):
    if url is None:
        monkeypatch.delenv("TEST_DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("TEST_DATABASE_URL", url)
    with pytest.raises(pytest.UsageError, match="isolated postgres-test/mathsim_test"):
        runpy.run_path(str(Path(__file__).with_name("conftest.py")))
