# backend/tests/test_properties.py

REGISTER_PAYLOAD = {
    "name": "João Silva",
    "cpf": "123.456.789-09",
    "sex": "M",
    "email": "joao@exemplo.com",
    "password": "senha123",
}

PROPERTY_PAYLOAD = {
    "name": "Fazenda São João",
    "location": "Estrada Rural km 10",
    "municipality": "Ribeirão Preto",
    "state": "SP",
    "zip_code": "14000-000",
    "total_area_ha": "100.5000",
    "own_area_ha": "80.0000",
    "leased_area_ha": "20.5000",
    "protected_area_ha": "15.0000",
    "people_count": 5,
    "crop_area_ha": "60.0000",
}


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_property(client):
    headers = _auth_header(client)
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Fazenda São João"
    assert "id" in data


def test_list_properties_only_own(client):
    # Usuário 1
    headers1 = _auth_header(client)
    client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers1)

    # Usuário 2
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}
    client.post("/api/properties/", json={**PROPERTY_PAYLOAD, "name": "Outra Fazenda"}, headers=headers2)

    res = client.get("/api/properties/", headers=headers1)
    assert res.status_code == 200
    props = res.json()
    assert len(props) == 1
    assert props[0]["name"] == "Fazenda São João"


def test_get_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    res = client.get(f"/api/properties/{created['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]


def test_get_property_of_other_user_returns_404(client):
    headers1 = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers1).json()

    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    res = client.get(f"/api/properties/{created['id']}", headers=headers2)
    assert res.status_code == 404


def test_update_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    updated = {**PROPERTY_PAYLOAD, "name": "Fazenda Atualizada"}
    res = client.put(f"/api/properties/{created['id']}", json=updated, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Fazenda Atualizada"


def test_delete_property(client):
    headers = _auth_header(client)
    created = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers).json()
    res = client.delete(f"/api/properties/{created['id']}", headers=headers)
    assert res.status_code == 204
    get_res = client.get(f"/api/properties/{created['id']}", headers=headers)
    assert get_res.status_code == 404
