from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Base, engine
import models
import schemas
import crud

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fruit Order API",
    description="카톡/문자 과일 주문을 MySQL에 저장하는 API",
)

origins = [
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/orders", response_model=schemas.OrderOut)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    order = crud.create_order(db, order_in)
    return order


@app.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return orders

