from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    item_type: str = Field(..., example="혼합과")
    kg: int = Field(..., example=10)
    box_count: int = Field(..., example=1)


class OrderCreate(BaseModel):
    receiver_name: str = Field(..., example="박xx")
    phone: str = Field(..., example="010-xxxx-xxxx")
    address: str = Field(
        ...,
        example="광주광역시 OO구 OO로 00, OO아파트 000-000",
    )
    raw_message: Optional[str] = Field(
        None,
        example=(
            "받는 사람 성함 : 박xx ... "
            "주문: 혼합과 10KG 1BOX, 혼합과 5KG 2BOX"
        ),
    )
    items: List[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    item_type: str
    kg: int
    box_count: int

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    receiver_name: str
    phone: str
    address: str
    raw_message: Optional[str]
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True

