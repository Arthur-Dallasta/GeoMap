# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.properties.router import router as properties_router
from app.areas.router import router as areas_router
from app.categories.router import router as categories_router
from app.subcategories.router import router as subcategories_router

app = FastAPI(title="GeoMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(areas_router)
app.include_router(categories_router)
app.include_router(subcategories_router)


@app.get("/health")
def health():
    return {"status": "ok"}
