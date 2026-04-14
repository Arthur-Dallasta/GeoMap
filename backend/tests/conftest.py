# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db

# Banco de dados de teste separado
TEST_DB_URL = settings.DATABASE_URL.rsplit("/geomap", 1)[0] + "/geomap_test"

test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Habilitar PostGIS no banco de testes (idempotente)
with test_engine.connect() as _conn:
    _conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    _conn.commit()


@pytest.fixture(scope="function")
def client():
    import app.auth.models  # noqa: F401
    import app.properties.models  # noqa: F401
    import app.areas.models  # noqa: F401
    import app.categories.models  # noqa: F401

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
