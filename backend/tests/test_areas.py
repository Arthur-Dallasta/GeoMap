# backend/tests/test_areas.py
import io
import json

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

BOUNDARY_GEOJSON = json.dumps({
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-47.9, -21.2],
            [-47.8, -21.2],
            [-47.8, -21.1],
            [-47.9, -21.1],
            [-47.9, -21.2],
        ]]
    },
    "properties": {}
})

INTERNAL_GEOJSON = json.dumps({
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-47.87, -21.18],
            [-47.82, -21.18],
            [-47.82, -21.13],
            [-47.87, -21.13],
            [-47.87, -21.18],
        ]]
    },
    "properties": {}
})

INVALID_GEOJSON = '{"type": "Feature", "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}'


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_property(client, headers) -> str:
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    return res.json()["id"]


def _make_file(content: str, filename: str = "area.geojson"):
    return ("file", (filename, io.BytesIO(content.encode()), "application/geo+json"))


def test_upload_boundary_creates_area(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "boundary"
    assert "id" in data


def test_upload_second_boundary_replaces_first(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)

    # Upload primeiro boundary
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    first_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    # Upload segundo boundary
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    second_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    assert first_id != second_id


def test_upload_internal_accumulates(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)

    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INTERNAL_GEOJSON)],
        headers=headers,
    )
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INTERNAL_GEOJSON)],
        headers=headers,
    )

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["internal"]) == 2


def test_get_areas_returns_null_boundary_when_none(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["boundary"] is None
    assert data["internal"] == []


def test_upload_invalid_geometry_type_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file(INVALID_GEOJSON)],
        headers=headers,
    )
    assert res.status_code == 400
    assert "Polygon" in res.json()["detail"]


def test_upload_invalid_json_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[_make_file("not valid json")],
        headers=headers,
    )
    assert res.status_code == 400


def test_delete_area(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "boundary"},
        files=[_make_file(BOUNDARY_GEOJSON)],
        headers=headers,
    )
    area_id = client.get(
        f"/api/properties/{prop_id}/areas/", headers=headers
    ).json()["boundary"]["properties"]["id"]

    res = client.delete(f"/api/properties/{prop_id}/areas/{area_id}", headers=headers)
    assert res.status_code == 204

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers)
    assert res.json()["boundary"] is None


def test_areas_of_other_user_property_returns_403(client):
    # Usuário 1 cria propriedade
    headers1 = _auth_header(client)
    prop_id = _create_property(client, headers1)

    # Usuário 2 tenta acessar
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    res = client.get(f"/api/properties/{prop_id}/areas/", headers=headers2)
    assert res.status_code == 403
