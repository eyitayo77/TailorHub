from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from models import Tailor, Order, Customer
from schemas import OrderCreate, OrderUpdate, OrderStatusUpdate, OrderOut
from auth.dependencies import get_current_tailor

router = APIRouter(prefix="/api/orders", tags=["Orders"])

VALID_STATUSES = {"pending", "progress", "fitting", "ready", "delivered"}


@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.payments))
        .filter(Order.tailor_id == tailor.id)
    )
    if status:
        query = query.filter(Order.status == status)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    orders = query.order_by(Order.created_at.desc()).all()
    return [_serialize(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    o = _get_or_404(db, tailor.id, order_id)
    return _serialize(o)


@router.post("", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    # Validate customer belongs to this tailor
    if payload.customer_id:
        cust = db.query(Customer).filter(
            Customer.id == payload.customer_id,
            Customer.tailor_id == tailor.id,
        ).first()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found.")

    order = Order(tailor_id=tailor.id, **payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return _serialize(order)


@router.put("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    o = _get_or_404(db, tailor.id, order_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(o, field, value)
    db.commit()
    db.refresh(o)
    return _serialize(o)


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {', '.join(VALID_STATUSES)}")
    o = _get_or_404(db, tailor.id, order_id)
    o.status = payload.status
    db.commit()
    db.refresh(o)
    return _serialize(o)


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    o = _get_or_404(db, tailor.id, order_id)
    db.delete(o)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────
def _get_or_404(db: Session, tailor_id: str, order_id: str) -> Order:
    o = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.payments))
        .filter(Order.tailor_id == tailor_id, Order.id == order_id)
        .first()
    )
    if not o:
        raise HTTPException(status_code=404, detail="Order not found.")
    return o


def _serialize(o: Order) -> OrderOut:
    amount_paid = float(sum(p.amount for p in o.payments))
    return OrderOut(
        id=o.id,
        customer_id=o.customer_id,
        customer_name=o.customer.name if o.customer else "—",
        garment=o.garment,
        status=o.status,
        due_date=o.due_date,
        total_price=float(o.total_price or 0),
        amount_paid=amount_paid,
        balance_due=float(o.total_price or 0) - amount_paid,
        notes=o.notes,
        created_at=o.created_at,
    )
