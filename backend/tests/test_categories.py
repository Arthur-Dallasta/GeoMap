# backend/tests/test_categories.py
import io
import json

import pytest
from pydantic import ValidationError

# ── Schema-level tests (no HTTP, no DB) ──────────────────────────────────────

def test_category_create_rejects_invalid_color():
    from app.categories.schemas import CategoryCreate
    with pytest.raises(ValidationError):
        CategoryCreate(name="Plantio", color="#000000")


def test_category_create_accepts_valid_color():
    from app.categories.schemas import CategoryCreate
    cat = CategoryCreate(name="Plantio", color="#ef4444")
    assert cat.color == "#ef4444"
    assert cat.description is None


# ── HTTP integration tests ────────────────────────────────────────────────────

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
        ]],
    },
    "properties": {},
})


def _auth_header(client) -> dict:
    res = client.post("/api/auth/register", json=REGISTER_PAYLOAD)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _create_property(client, headers) -> str:
    res = client.post("/api/properties/", json=PROPERTY_PAYLOAD, headers=headers)
    return res.json()["id"]


def _create_category(client, headers, prop_id, name="Plantio", color="#ef4444") -> dict:
    res = client.post(
        f"/api/properties/{prop_id}/categories/",
        json={"name": name, "color": color, "description": "desc"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()


def _upload_internal(client, headers, prop_id) -> str:
    res = client.post(
        f"/api/properties/{prop_id}/areas/",
        data={"type": "internal"},
        files=[("file", ("area.geojson", io.BytesIO(INTERNAL_GEOJSON.encode()), "application/geo+json"))],
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_create_category_returns_201(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    assert cat["name"] == "Plantio"
    assert cat["color"] == "#ef4444"
    assert cat["description"] == "desc"
    assert "id" in cat
    assert cat["property_id"] == prop_id


def test_list_categories_returns_only_own(client):
    # User 1 creates category
    headers1 = _auth_header(client)
    prop_id = _create_property(client, headers1)
    _create_category(client, headers1, prop_id)

    # User 2 has their own property
    payload2 = {**REGISTER_PAYLOAD, "email": "outro@exemplo.com", "cpf": "987.654.321-00"}
    res2 = client.post("/api/auth/register", json=payload2)
    headers2 = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    # User 2 tries to list user 1's categories — should 403
    res = client.get(f"/api/properties/{prop_id}/categories/", headers=headers2)
    assert res.status_code == 403


def test_update_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    cat_id = cat["id"]

    res = client.put(
        f"/api/properties/{prop_id}/categories/{cat_id}",
        json={"name": "Pastagem", "color": "#22c55e"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Pastagem"
    assert data["color"] == "#22c55e"


def test_delete_category_sets_area_category_id_to_null(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    cat_id = cat["id"]
    area_id = _upload_internal(client, headers, prop_id)

    # Assign category to area
    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat_id},
        headers=headers,
    )
    assert res.status_code == 200

    # Delete the category
    res = client.delete(
        f"/api/properties/{prop_id}/categories/{cat_id}", headers=headers
    )
    assert res.status_code == 204

    # Area should now have category_id null
    areas = client.get(f"/api/properties/{prop_id}/areas/", headers=headers).json()
    area_feature = areas["internal"][0]
    assert area_feature["properties"]["category_id"] is None
    assert area_feature["properties"]["category_color"] is None


def test_create_category_invalid_color_returns_400(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    res = client.post(
        f"/api/properties/{prop_id}/categories/",
        json={"name": "Plantio", "color": "#000000"},
        headers=headers,
    )
    assert res.status_code == 422  # Pydantic validator raises 422


def test_patch_area_assigns_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    area_id = _upload_internal(client, headers, prop_id)

    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["category_id"] == cat["id"]

    # Confirm GET /areas/ includes category_color
    areas = client.get(f"/api/properties/{prop_id}/areas/", headers=headers).json()
    assert areas["internal"][0]["properties"]["category_color"] == "#ef4444"


def test_patch_area_remove_category(client):
    headers = _auth_header(client)
    prop_id = _create_property(client, headers)
    cat = _create_category(client, headers, prop_id)
    area_id = _upload_internal(client, headers, prop_id)

    # Assign then remove
    client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    res = client.patch(
        f"/api/properties/{prop_id}/areas/{area_id}",
        json={"category_id": None},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["category_id"] is None


def test_patch_area_category_from_another_property_returns_400(client):
    headers = _auth_header(client)
    prop1_id = _create_property(client, headers)
    prop2_id = _create_property(client, headers)
    # create category in prop2
    cat = _create_category(client, headers, prop2_id, color="#3b82f6")
    area_id = _upload_internal(client, headers, prop1_id)

    res = client.patch(
        f"/api/properties/{prop1_id}/areas/{area_id}",
        json={"category_id": cat["id"]},
        headers=headers,
    )
    assert res.status_code == 400
    assert "does not belong" in res.json()["detail"]
