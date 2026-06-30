from typing import List
from sqlalchemy.orm import Session

import models
import schemas


class OrderValidationError(ValueError):
    """주문 데이터가 업무 규칙을 위반했을 때 발생하는 예외."""


def create_order(db: Session, order_in: schemas.OrderCreate) -> models.Order:
    """주문 헤더와 품목을 하나의 트랜잭션으로 저장한다.

    품목 중 하나라도 유효하지 않으면 이미 추가된 주문 헤더까지 전부 롤백해
    주문이 부분 저장(half-saved)되지 않도록 보장한다(원자성).
    """
    if not order_in.items:
        raise OrderValidationError("주문에는 최소 1개의 품목이 필요합니다.")

    try:
        order = models.Order(
            receiver_name=order_in.receiver_name,
            phone=order_in.phone,
            address=order_in.address,
            raw_message=order_in.raw_message,
        )
        db.add(order)
        db.flush()  # order.id 확보 — 아직 커밋 전(트랜잭션 내부)

        for item_in in order_in.items:
            if item_in.kg <= 0 or item_in.box_count <= 0:
                # 품목 하나라도 잘못되면 위에서 flush된 주문까지 통째로 롤백된다.
                raise OrderValidationError("kg와 box_count는 1 이상이어야 합니다.")
            db.add(
                models.OrderItem(
                    order_id=order.id,
                    item_type=item_in.item_type,
                    kg=item_in.kg,
                    box_count=item_in.box_count,
                )
            )

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return order


def get_orders(db: Session, skip: int = 0, limit: int = 50) -> List[models.Order]:
    return (
        db.query(models.Order)
        .order_by(models.Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
