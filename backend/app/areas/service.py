# backend/app/areas/service.py
import json
import uuid

from fastapi import HTTPException, UploadFile
from geoalchemy2.shape import from_shape
from shapely.geometry import shape as shapely_shape
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.areas.models import Area
from app.areas.schemas import AreaFeature, AreaListResponse


def _area_to_feature(db: Session, area: Area) -> AreaFeature:
    geojson_str = db.scalar(func.ST_AsGeoJSON(area.geometry))
    return AreaFeature(
        geometry=json.loads(geojson_str),
        properties={"id": str(area.id), "type": area.type},
    )


def list_areas(db: Session, property_id: uuid.UUID) -> AreaListResponse:
    areas = db.query(Area).filter(Area.property_id == property_id).all()
    boundary = None
    internal = []
    for area in areas:
        feature = _area_to_feature(db, area)
        if area.type == "boundary":
            boundary = feature
        else:
            internal.append(feature)
    return AreaListResponse(boundary=boundary, internal=internal)


async def upload_area(
    db: Session,
    property_id: uuid.UUID,
    area_type: str,
    file: UploadFile,
) -> Area:
    # Validar tipo
    if area_type not in ("boundary", "internal"):
        raise HTTPException(status_code=400, detail="type must be 'boundary' or 'internal'")

    # Ler e parsear GeoJSON
    try:
        content = await file.read()
        geojson = json.loads(content)
    except (json.JSONDecodeError, Exception):
        raise HTTPException(status_code=400, detail="Invalid GeoJSON file")

    # Validar estrutura: deve ser Feature com Polygon ou MultiPolygon
    if geojson.get("type") != "Feature":
        raise HTTPException(status_code=400, detail="GeoJSON must be a Feature")
    geometry = geojson.get("geometry", {})
    if geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise HTTPException(
            status_code=400, detail="Geometry must be Polygon or MultiPolygon"
        )

    # Validar geometria com Shapely
    try:
        geom = shapely_shape(geometry)
        if not geom.is_valid:
            raise HTTPException(status_code=400, detail="Invalid geometry")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid geometry")

    # Substituir boundary anterior se necessário
    if area_type == "boundary":
        db.query(Area).filter(
            Area.property_id == property_id, Area.type == "boundary"
        ).delete()

    # Salvar no banco
    area = Area(
        id=uuid.uuid4(),
        property_id=property_id,
        type=area_type,
        geometry=from_shape(geom, srid=4326),
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def delete_area(db: Session, area: Area) -> None:
    db.delete(area)
    db.commit()


def get_area(db: Session, area_id: uuid.UUID, property_id: uuid.UUID) -> Area | None:
    return (
        db.query(Area)
        .filter(Area.id == area_id, Area.property_id == property_id)
        .first()
    )
