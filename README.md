# 과일 주문 관리 시스템 (Fruit Order Management System)

카카오톡/문자 메시지로 받은 과일 주문을 자동으로 파싱하여 MySQL 데이터베이스에 저장하는 웹 애플리케이션입니다.

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
├── backend/          # FastAPI 백엔드
│   ├── main.py       # FastAPI 앱 엔트리포인트
│   ├── database.py   # DB 연결 설정
│   ├── models.py     # SQLAlchemy 모델
│   ├── schemas.py    # Pydantic 스키마
│   ├── crud.py       # DB CRUD 로직
│   ├── requirements.txt
│   └── .env          # 환경 변수 (gitignore됨)
│
└── frontend/         # React 프런트엔드
    ├── src/
    │   ├── App.jsx   # 메인 컴포넌트
    │   └── App.css   # 스타일
    └── package.json
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
  "receiver_name": "박환희",
  "phone": "010-3095-0628",
  "address": "광주광역시 임방울대로142-12, 삼성아파트 111-2204",
  "raw_message": "받는 사람 성함 : 박환희 ...",
  "items": [
    { "item_type": "혼합과", "kg": 10, "box_count": 1 },
    { "item_type": "혼합과", "kg": 5, "box_count": 2 }
  ]
}
```

### GET /orders
주문 목록 조회 (페이징 지원)

## 🎯 향후 계획

- [ ] 카톡/문자 원문에서 정보 자동 추출 (AI 파서)
- [ ] 저장된 데이터 → 엑셀/CSV 다운로드
- [ ] 주문 리스트 페이지 (검색/필터링)
- [ ] Google Sheets 연동

## 📝 라이선스

MIT

