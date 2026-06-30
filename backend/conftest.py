import os
import sys

# main/database 등 flat import(`import models`)가 동작하도록 backend 디렉터리를 경로에 추가.
sys.path.insert(0, os.path.dirname(__file__))

# main 임포트 시 MySQL에 연결해 테이블을 만드는 동작을 막는다(테스트는 SQLite 사용).
os.environ["GYUL_SKIP_DB_INIT"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
import models  # noqa: F401  (테이블 메타데이터 등록용)
import main


@pytest.fixture
def client():
    """테스트마다 격리된 인메모리 SQLite DB를 사용하는 TestClient."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 인메모리 DB를 단일 연결로 공유
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
