from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    receiver_name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(String(255), nullable=False)
    raw_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    item_type = Column(String(20), nullable=False)
    kg = Column(Integer, nullable=False)
    box_count = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")

