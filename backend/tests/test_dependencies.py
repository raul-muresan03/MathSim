import runpy
import secrets

import pytest

import dependencies


@pytest.mark.parametrize("key", [None, "", "   ", "secret_key", "a" * 31, " " * 32])
def test_missing_or_short_signing_key_prevents_startup(monkeypatch, key):
    if key is None:
        monkeypatch.delenv("SECRET_KEY", raising=False)
    else:
        monkeypatch.setenv("SECRET_KEY", key)

    with pytest.raises(RuntimeError, match="SECRET_KEY is required"):
        runpy.run_path(dependencies.__file__)


def test_configured_signing_key_is_used(monkeypatch):
    key = secrets.token_hex(32)
    monkeypatch.setenv("SECRET_KEY", key)
    config = runpy.run_path(dependencies.__file__)
    token = config["create_access_token"]({"sub": "testuser"})

    assert config["SECRET_KEY"] == key
    assert dependencies.jwt.decode(token, key, algorithms=["HS256"])["sub"] == "testuser"
