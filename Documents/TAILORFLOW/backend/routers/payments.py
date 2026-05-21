from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models import Tailor, Payment, Order
from schemas import PaymentCreate, PaymentOut
from auth.dependencies import get_current_tailor

router = APIRouter(tags=["Payments"])


@router.get("/api/payments", response_model=List[PaymentOut])
def list_payments(
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Return all payments for this tailor, newest first."""
    payments = (
        db.query(Payment)
        .options(joinedload(Payment.order).joinedload(Order.customer))
        .filter(Payment.tailor_id == tailor.id)
        .order_by(Payment.date.desc(), Payment.created_at.desc())
        .all()
    )
    return [_serialize(p) for p in payments]


@router.post("/api/orders/{order_id}/payments", response_model=PaymentOut, status_code=201)
def record_payment(
    order_id: str,
    payload: PaymentCreate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Record a payment against a specific order."""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tailor_id == tailor.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    payment = Payment(
        tailor_id=tailor.id,
        order_id=order_id,
        **payload.model_dump(),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Re-load with relationships for serialization
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.order).joinedload(Order.customer))
        .filter(Payment.id == payment.id)
        .first()
    )
    return _serialize(payment)


@router.get("/api/orders/{order_id}/receipt")
def get_receipt(
    order_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Return a payment summary / receipt for one order."""
    order = (
        db.query(Order)
        .options(joinedload(Order.payments), joinedload(Order.customer))
        .filter(Order.id == order_id, Order.tailor_id == tailor.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    paid = float(sum(p.amount for p in order.payments))
    return {
        "order_id":      order.id,
        "customer_name": order.customer.name if order.customer else "—",
        "garment":       order.garment,
        "total_price":   float(order.total_price or 0),
        "amount_paid":   paid,
        "balance_due":   float(order.total_price or 0) - paid,
        "payments":      [_serialize(p) for p in order.payments],
    }


@router.delete("/api/payments/{payment_id}", status_code=204)
def delete_payment(
    payment_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.tailor_id == tailor.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    db.delete(payment)
    db.commit()


# ── Helper ────────────────────────────────────────────────────────
def _serialize(p: Payment) -> PaymentOut:
    customer_name = "—"
    garment = "—"
    if p.order:
        garment = p.order.garment
        if p.order.customer:
            customer_name = p.order.customer.name
    return PaymentOut(
        id=p.id,
        order_id=p.order_id,
        customer_name=customer_name,
        garment=garment,
        amount=float(p.amount),
        type=p.type,
        method=p.method,
        date=p.date,
        note=p.note,
        created_at=p.created_at,
    )
