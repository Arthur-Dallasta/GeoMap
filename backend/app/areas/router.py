import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.areas import service
from app.areas.schemas import AreaAssignRequest, AreaListResponse
from app.properties import service as property_service

router = APIRouter(prefix="/api/properties/{property_id}/areas", tags=["areas"])


def _get_property_or_403(property_id: uuid.UUID, db: Session, current_user: User):
    prop = property_service.get_property(db, property_id, current_user.id)
    if not prop:
        raise HTTPException(status_code=403, detail="Forbidden")
    return prop


@router.get("/", response_model=AreaListResponse)
def list_areas(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    return service.list_areas(db, property_id)


@router.post("/", status_code=201)
async def upload_area(
    property_id: uuid.UUID,
    type: str = Form(...),
    file: UploadFile = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = await service.upload_area(db, property_id, type, file)
    return {"id": str(area.id), "type": area.type, "property_id": str(area.property_id)}


@router.patch("/{area_id}")
def assign_area(
    property_id: uuid.UUID,
    area_id: uuid.UUID,
    data: AreaAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = service.get_area(db, area_id, property_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")

    if "category_id" in data.model_fields_set:
        service.assign_category(db, area, data.category_id)
    if "subcategory_id" in data.model_fields_set:
        service.assign_subcategory(db, area, data.subcategory_id, property_id)

    return {
        "id": str(area.id),
        "category_id": str(area.category_id) if area.category_id else None,
        "subcategory_id": str(area.subcategory_id) if area.subcategory_id else None,
    }


@router.delete("/{area_id}", status_code=204)
def delete_area(
    property_id: uuid.UUID,
    area_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_property_or_403(property_id, db, current_user)
    area = service.get_area(db, area_id, property_id)
    if not area:
        raise HTTPException(status_code=404, detail="Área não encontrada")
    service.delete_area(db, area)
