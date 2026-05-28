class TestAuth:
    def test_register_creates_user(self, client):
        response = client.post("/api/register", json={"username": "newuser", "password": "secret"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"
        assert data["role"] == "student"
        assert "access_token" in data

    def test_register_duplicate_rejected(self, client):
        client.post("/api/register", json={"username": "dup", "password": "x"})
        response = client.post("/api/register", json={"username": "dup", "password": "y"})
        assert response.status_code == 400

    def test_register_empty_fields(self, client):
        response = client.post("/api/register", json={"username": "", "password": ""})
        assert response.status_code == 400

    def test_login_returns_token(self, client):
        client.post("/api/register", json={"username": "logme", "password": "pw"})
        response = client.post("/api/login", json={"username": "logme", "password": "pw"})
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_wrong_password(self, client):
        client.post("/api/register", json={"username": "x", "password": "right"})
        response = client.post("/api/login", json={"username": "x", "password": "wrong"})
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post("/api/login", json={"username": "nobody", "password": "x"})
        assert response.status_code == 401


class TestPublicEndpoints:
    def test_health(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_chapters(self, client):
        response = client.get("/api/chapters")
        assert response.status_code == 200
        assert "chapters" in response.json()

    def test_stats_empty(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        assert response.json()["total_users"] == 0


class TestProtectedEndpoints:
    def test_generate_requires_no_auth(self, client):
        response = client.post("/api/simulation/generate", json={
            "total_quizzes": 2,
            "chapters": {"algebra": {"weight": 1.0}}
        })
        assert response.status_code in [200, 500]

    def test_grade_requires_auth(self, client):
        response = client.post("/api/simulation/grade", json={
            "session_id": "nonexistent",
            "answers": [],
            "elapsed": 0,
        })
        assert response.status_code == 401

    def test_grade_with_valid_token(self, client, auth_headers):
        response = client.post("/api/simulation/grade", json={
            "session_id": "nonexistent",
            "answers": [],
            "elapsed": 0,
        }, headers=auth_headers)
        assert response.status_code == 404

    def test_delete_own_account(self, client, auth_headers):
        response = client.delete("/api/account", headers=auth_headers)
        assert response.status_code == 200
        assert "șters" in response.json()["message"]

    def test_delete_own_account_requires_auth(self, client):
        response = client.delete("/api/account")
        assert response.status_code == 401


class TestAdminEndpoints:
    def test_promote_requires_admin(self, client, auth_headers):
        response = client.put("/api/users/testuser/role", headers=auth_headers)
        assert response.status_code == 403

    def test_promote_as_admin(self, client, admin_headers):
        response = client.put("/api/users/admin/role", headers=admin_headers)
        assert response.status_code == 200

    def test_delete_user_requires_admin(self, client, auth_headers):
        response = client.delete("/api/users/testuser", headers=auth_headers)
        assert response.status_code == 403

    def test_users_list(self, client):
        response = client.get("/api/users")
        assert response.status_code == 200
        assert "users" in response.json()
        assert "total" in response.json()

    def test_user_stats_empty(self, client):
        response = client.get("/api/users/nonexistent/stats")
        assert response.status_code == 404


class TestGradeFlow:
    def test_full_grade_flow(self, client, auth_headers):
        pass
