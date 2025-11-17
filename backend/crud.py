from typing import List
from sqlalchemy.orm import Session

import models
import schemas


def create_order(db: Session, order_in: schemas.OrderCreate) -> models.Order:
    order = models.Order(
        receiver_name=order_in.receiver_name,
        phone=order_in.phone,
        address=order_in.address,
        raw_message=order_in.raw_message,
    )
    db.add(order)
    db.flush()

    for item_in in order_in.items:
        item = models.OrderItem(
            order_id=order.id,
            item_type=item_in.item_type,
            kg=item_in.kg,
            box_count=item_in.box_count,
        )
        db.add(item)

    db.commit()
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

