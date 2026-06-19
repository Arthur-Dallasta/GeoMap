import io
import json
import uuid
import zipfile

import shapefile as pyshp
from fastapi import HTTPException, UploadFile
from geoalchemy2.shape import from_shape, to_shape
from shapely import force_2d
from shapely.geometry import shape as shapely_shape
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.areas.models import Area
from app.areas.schemas import AreaFeature, AreaListResponse


def _read_shapefile_from_zip(zf: zipfile.ZipFile) -> dict:
    names = zf.namelist()
    shp_name = next((n for n in names if n.lower().endswith(".shp")), None)
    if not shp_name:
        raise HTTPException(400, "Shapefile .shp não encontrado no ZIP")
    dbf_name = next((n for n in names if n.lower().endswith(".dbf")), None)
    shx_name = next((n for n in names if n.lower().endswith(".shx")), None)
    shp_bytes = io.BytesIO(zf.read(shp_name))
    dbf_bytes = io.BytesIO(zf.read(dbf_name)) if dbf_name else io.BytesIO(b"")
    shx_bytes = io.BytesIO(zf.read(shx_name)) if shx_name else io.BytesIO(b"")
    sf = pyshp.Reader(shp=shp_bytes, dbf=dbf_bytes, shx=shx_bytes)
    shapes = sf.shapes()
    if not shapes:
        raise HTTPException(400, "Shapefile sem geometrias")
    return shapes[0].__geo_interface__


def _zip_to_geometry(content: bytes) -> dict:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as outer:
            names = outer.namelist()
            inner_zips = [n for n in names if n.lower().endswith(".zip")]
            shp_files = [n for n in names if n.lower().endswith(".shp")]
            if inner_zips:
                inner_bytes = outer.read(inner_zips[0])
                with zipfile.ZipFile(io.BytesIO(inner_bytes)) as inner:
                    return _read_shapefile_from_zip(inner)
            elif shp_files:
                return _read_shapefile_from_zip(outer)
            else:
                raise HTTPException(400, "ZIP não contém shapefile reconhecível")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Erro ao processar arquivo ZIP")


def _area_to_feature(db: Session, area: Area) -> AreaFeature:
    from app.categories.models import Category
    from app.subcategories.models import Subcategory

    geojson_str = db.scalar(func.ST_AsGeoJSON(area.geometry))
    category_color = None
    category_name = None
    subcategory_name = None

    if area.category_id:
        cat = db.get(Category, area.category_id)
        category_color = cat.color if cat else None
        category_name = cat.name if cat else None

    if area.subcategory_id:
        sub = db.get(Subcategory, area.subcategory_id)
        subcategory_name = sub.name if sub else None

    return AreaFeature(
        geometry=json.loads(geojson_str),
        properties={
            "id": str(area.id),
            "type": area.type,
            "category_id": str(area.category_id) if area.category_id else None,
            "category_color": category_color,
            "category_name": category_name,
            "subcategory_id": str(area.subcategory_id) if area.subcategory_id else None,
            "subcategory_name": subcategory_name,
        },
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
    if area_type not in ("boundary", "internal"):
        raise HTTPException(status_code=400, detail="type must be 'boundary' or 'internal'")

    try:
        content = await file.read()
        filename = (file.filename or "").lower()
        if filename.endswith(".zip"):
            geometry = _zip_to_geometry(content)
        else:
            geojson = json.loads(content)
            if geojson.get("type") == "FeatureCollection":
                features = geojson.get("features", [])
                if not features:
                    raise HTTPException(status_code=400, detail="FeatureCollection is empty")
                geojson = features[0]
            elif geojson.get("type") != "Feature":
                raise HTTPException(status_code=400, detail="GeoJSON must be a Feature or FeatureCollection")
            geometry = geojson.get("geometry", {})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid GeoJSON file")

    if geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise HTTPException(
            status_code=400, detail="Geometry must be Polygon or MultiPolygon"
        )

    try:
        geom = force_2d(shapely_shape(geometry))
        if not geom.is_valid:
            raise HTTPException(status_code=400, detail="Invalid geometry")
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid geometry")

    if area_type == "internal":
        boundary_row = (
            db.query(Area)
            .filter(Area.property_id == property_id, Area.type == "boundary")
            .first()
        )
        if not boundary_row:
            raise HTTPException(
                status_code=422,
                detail="Cadastre o contorno da propriedade antes de importar áreas internas.",
            )
        boundary_shape = force_2d(to_shape(boundary_row.geometry))
        if not boundary_shape.covers(geom):
            raise HTTPException(
                status_code=422,
                detail="A área interna deve estar completamente dentro do contorno da propriedade.",
            )

    if area_type == "boundary":
        db.query(Area).filter(
            Area.property_id == property_id, Area.type == "boundary"
        ).delete()

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


def assign_category(
    db: Session,
    area: Area,
    category_id: uuid.UUID | None,
) -> Area:
    if category_id is not None:
        from app.categories.models import Category

        cat = db.get(Category, category_id)
        if not cat:
            raise HTTPException(status_code=400, detail="Category not found")
    area.category_id = category_id
    db.commit()
    db.refresh(area)
    return area


def assign_subcategory(
    db: Session,
    area: Area,
    subcategory_id: uuid.UUID | None,
    property_id: uuid.UUID,
) -> Area:
    if subcategory_id is not None:
        from app.subcategories.models import Subcategory

        sub = (
            db.query(Subcategory)
            .filter(
                Subcategory.id == subcategory_id,
                Subcategory.property_id == property_id,
            )
            .first()
        )
        if not sub:
            raise HTTPException(status_code=400, detail="Subcategory not found")
    area.subcategory_id = subcategory_id
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
