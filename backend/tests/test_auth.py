# backend/tests/test_auth.py


def test_register_success(client):
    res = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    payload = {
        "name": "João Silva",
        "cpf": "123.456.789-09",
        "sex": "M",
        "email": "joao@exemplo.com",
        "password": "senha123",
    }
    client.post("/api/auth/register", json=payload)
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


def test_register_invalid_cpf(client):
    res = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "12345678909",  # sem pontuação
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    assert res.status_code == 422


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "joao@exemplo.com", "password": "senha123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "joao@exemplo.com", "password": "errada"},
    )
    assert res.status_code == 401


def test_me_authenticated(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    token = reg.json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "joao@exemplo.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_forgot_password_logs_link(client, capsys):
    client.post(
        "/api/auth/register",
        json={
            "name": "João Silva",
            "cpf": "123.456.789-09",
            "sex": "M",
            "email": "joao@exemplo.com",
            "password": "senha123",
        },
    )
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "joao@exemplo.com"},
    )
    assert res.status_code == 200
    captured = capsys.readouterr()
    assert "reset" in captured.out.lower() or "token" in captured.out.lower()
