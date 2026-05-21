import uuid
from datetime import date, datetime
from sqlalchemy import (
    Column, String, Text, Numeric, Date, Time,
    DateTime, ForeignKey, CheckConstraint, Boolean, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


def new_uuid():
    return str(uuid.uuid4())


class Tailor(Base):
    """A registered tailor / business account."""
    __tablename__ = "tailors"

    id            = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    name          = Column(String(120), nullable=False)
    business_name = Column(String(160))
    email         = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    phone         = Column(String(30))
    is_admin      = Column(Boolean, default=False, nullable=False, server_default="0")
    is_active     = Column(Boolean, default=True,  nullable=False, server_default="1")
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    reset_token         = Column(String(64),  nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    customers    = relationship("Customer",    back_populates="tailor", cascade="all, delete")
    orders       = relationship("Order",       back_populates="tailor", cascade="all, delete")
    payments     = relationship("Payment",     back_populates="tailor", cascade="all, delete")
    appointments = relationship("Appointment", back_populates="tailor", cascade="all, delete")


class Customer(Base):
    """A customer that belongs to one tailor."""
    __tablename__ = "customers"

    id           = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    tailor_id    = Column(UUID(as_uuid=False), ForeignKey("tailors.id", ondelete="CASCADE"), nullable=False, index=True)
    name         = Column(String(120), nullable=False)
    phone        = Column(String(30))
    email        = Column(String(200))
    measurements = Column(Text)   # stored as JSON string for flexibility
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    tailor       = relationship("Tailor",  back_populates="customers")
    orders       = relationship("Order",   back_populates="customer")
    appointments = relationship("Appointment", back_populates="customer")

    @property
    def orders_count(self):
        return len(self.orders)

    @property
    def total_spent(self):
        return sum(p.amount for o in self.orders for p in o.payments)


class Order(Base):
    """A garment order placed by a customer."""
    __tablename__ = "orders"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    tailor_id   = Column(UUID(as_uuid=False), ForeignKey("tailors.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True)
    garment     = Column(String(200), nullable=False)
    status      = Column(
        String(20), default="pending",
        nullable=False
    )
    due_date    = Column(Date)
    total_price = Column(Numeric(12, 2), default=0)
    notes       = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','progress','fitting','ready','delivered')",
            name="order_status_check"
        ),
    )

    tailor   = relationship("Tailor",   back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    payments = relationship("Payment",  back_populates="order", cascade="all, delete")

    @property
    def amount_paid(self):
        return sum(p.amount for p in self.payments)

    @property
    def balance_due(self):
        return float(self.total_price or 0) - self.amount_paid

    @property
    def customer_name(self):
        return self.customer.name if self.customer else "—"


class Payment(Base):
    """A payment record linked to an order."""
    __tablename__ = "payments"

    id        = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    tailor_id = Column(UUID(as_uuid=False), ForeignKey("tailors.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id  = Column(UUID(as_uuid=False), ForeignKey("orders.id",   ondelete="CASCADE"), nullable=True)
    amount    = Column(Numeric(12, 2), nullable=False)
    type      = Column(String(20))     # deposit | balance | full
    method    = Column(String(20))     # Transfer | Cash | POS
    date      = Column(Date, default=date.today)
    note      = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("type IN ('deposit','balance','full')",         name="payment_type_check"),
        CheckConstraint("method IN ('Transfer','Cash','POS')",          name="payment_method_check"),
    )

    tailor = relationship("Tailor", back_populates="payments")
    order  = relationship("Order",  back_populates="payments")

    @property
    def customer_name(self):
        return self.order.customer_name if self.order else "—"

    @property
    def garment(self):
        return self.order.garment if self.order else "—"


class Appointment(Base):
    """A scheduled appointment with a customer."""
    __tablename__ = "appointments"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=new_uuid)
    tailor_id   = Column(UUID(as_uuid=False), ForeignKey("tailors.id",   ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True)
    type        = Column(String(60))   # fitting | consultation | delivery | etc.
    date        = Column(Date, nullable=False)
    time        = Column(Time)
    note        = Column(Text)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    tailor   = relationship("Tailor",   back_populates="appointments")
    customer = relationship("Customer", back_populates="appointments")

    @property
    def customer_name(self):
        return self.customer.name if self.customer else "—"
