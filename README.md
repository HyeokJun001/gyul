# 과일 주문 관리 시스템 (Fruit Order Management System)

![CI](https://github.com/HyeokJun001/gyul/actions/workflows/ci.yml/badge.svg)

카카오톡/문자 메시지로 받은 과일 주문을 자동으로 파싱하여 MySQL 데이터베이스에 저장하는 웹 애플리케이션입니다.

## 📌 프로젝트 배경

소규모 과일 판매에서 주문은 대부분 **카카오톡·문자**로 들어오는데, 이를 사람이 일일이 엑셀에 옮겨
적는 과정에서 누락·오타가 생깁니다. 이 반복 작업을 줄이기 위해 주문 메시지를 받아 **구조화된 데이터로
저장·조회**하는 API/웹을 만들었습니다.

- 주문 1건 = 주문 정보(받는 사람·연락처·주소) + 여러 품목(종류·중량·박스 수)의 **1:N 구조**
- 주문과 품목은 **하나의 트랜잭션으로 원자적 저장**되어, 품목이 하나라도 잘못되면 전체가 롤백됩니다.

## 🚀 기술 스택

### Backend
- **FastAPI** - RESTful API 서버
- **SQLAlchemy** - ORM
- **MySQL** (PyMySQL) - 데이터베이스
- **Python 3.13**

### Frontend
- **React** - UI 프레임워크
- **Vite** - 빌드 도구
- **Axios** - HTTP 클라이언트

## 📁 프로젝트 구조

```
gyul/
├── backend/                 # FastAPI 백엔드
│   ├── main.py              # FastAPI 앱 엔트리포인트
│   ├── database.py          # DB 연결 설정
│   ├── models.py            # SQLAlchemy 모델 (Order 1:N OrderItem)
│   ├── schemas.py           # Pydantic 스키마
│   ├── crud.py              # 주문 저장 로직 (트랜잭션 원자성)
│   ├── conftest.py          # 테스트 픽스처 (인메모리 SQLite)
│   ├── tests/               # pytest 테스트
│   ├── requirements.txt
│   └── requirements-dev.txt # 테스트 전용 의존성
│
├── frontend/                # React 프런트엔드
│   └── src/
│       ├── App.jsx          # 메인 컴포넌트
│       └── App.css
│
└── .github/workflows/       # GitHub Actions CI (push·PR 시 pytest 자동 실행)
```

## 🛠️ 설치 및 실행

### Backend 설정

1. 가상환경 생성 및 활성화:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
```

2. 의존성 설치:
```bash
pip install -r requirements.txt
```

3. `.env` 파일 생성:
```env
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=fruit_orders
```

4. 서버 실행:
```bash
uvicorn main:app --reload
```

서버는 `http://127.0.0.1:8000`에서 실행됩니다.
API 문서: `http://127.0.0.1:8000/docs`

### Frontend 설정

1. 의존성 설치:
```bash
cd frontend
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

프런트엔드는 `http://localhost:5173`에서 실행됩니다.

## 📊 데이터베이스 스키마

### orders 테이블
- `id` (PK)
- `receiver_name` - 받는 사람 이름
- `phone` - 전화번호
- `address` - 주소
- `raw_message` - 원본 메시지 (카톡/문자)
- `created_at` - 생성 시간

### order_items 테이블
- `id` (PK)
- `order_id` (FK) - orders.id
- `item_type` - 품목 종류 (대과/혼합과)
- `kg` - 중량
- `box_count` - 박스 수

## 🔌 API 엔드포인트

### POST /orders
주문 생성

**Request Body:**
```json
{
  "receiver_name": "박xx",
  "phone": "010-xxxx-xxxx",
  "address": "광주광역시 OO구 OO로 00, OO아파트 000-000",
  "raw_message": "받는 사람 성함 : 박xx ...",
  "items": [
    { "item_type": "혼합과", "kg": 10, "box_count": 1 },
    { "item_type": "혼합과", "kg": 5, "box_count": 2 }
  ]
}
```

### GET /orders
주문 목록 조회 (페이징 지원)

## ✅ 테스트 & 트랜잭션 무결성

주문 생성은 **주문 헤더 + 품목들을 하나의 트랜잭션으로 저장**하며, 품목이 하나라도
유효하지 않으면 이미 추가된 주문까지 전부 롤백되어 부분 저장을 방지합니다(원자성).
관련 로직은 `backend/crud.py`의 `create_order`에 있습니다.

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -v
```

테스트(`backend/tests/`)는 MySQL 없이 인메모리 SQLite로 격리 실행되며,
push/PR 시 GitHub Actions(`.github/workflows/ci.yml`)에서 자동으로 돌아갑니다.

- 주문 생성 → 품목 포함 정상 저장
- 주문 목록 조회
- 품목 없는 주문 거부 (400)
- **유효하지 않은 품목 포함 시 주문 전체 롤백 (원자성 검증)**

## 🎯 향후 계획

- [ ] 카톡/문자 원문에서 정보 자동 추출 (AI 파서)
- [ ] 저장된 데이터 → 엑셀/CSV 다운로드
- [ ] 주문 리스트 페이지 (검색/필터링)
- [ ] Google Sheets 연동

## 📝 라이선스

MIT

