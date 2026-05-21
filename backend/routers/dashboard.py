from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime
from typing import List

from database import get_db
from models import Tailor, Order, Payment, Customer, Appointment
from schemas import DashboardSummary
from auth.dependencies import get_current_tailor

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    # Total revenue (sum of all payments)
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.tailor_id == tailor.id
    ).scalar() or 0

    # Active orders (not delivered)
    active_orders = db.query(func.count(Order.id)).filter(
        Order.tailor_id == tailor.id,
        Order.status.notin_(["delivered"]),
    ).scalar() or 0

    # Customers count
    customers_count = db.query(func.count(Customer.id)).filter(
        Customer.tailor_id == tailor.id
    ).scalar() or 0

    # Pending payments = sum of (total_price - amount_paid) for non-delivered orders
    orders = db.query(Order).filter(
        Order.tailor_id == tailor.id,
        Order.status.notin_(["delivered"]),
    ).all()
    pending_payments = sum(
        max(0, float(o.total_price or 0) - float(sum(p.amount for p in o.payments)))
        for o in orders
    )

    # This month
    orders_this_month = db.query(func.count(Order.id)).filter(
        Order.tailor_id == tailor.id,
        extract("month", Order.created_at) == now.month,
        extract("year",  Order.created_at) == now.year,
    ).scalar() or 0

    revenue_this_month = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.tailor_id == tailor.id,
        extract("month", Payment.created_at) == now.month,
        extract("year",  Payment.created_at) == now.year,
    ).scalar() or 0

    return DashboardSummary(
        total_revenue=float(total_revenue),
        active_orders=int(active_orders),
        customers_count=int(customers_count),
        pending_payments=float(pending_payments),
        orders_this_month=int(orders_this_month),
        revenue_this_month=float(revenue_this_month),
    )
