from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
from typing import List

from database import get_db
from models import Tailor, Payment, Order, Customer
from schemas import RevenuePoint, TopCustomer
from auth.dependencies import get_current_tailor

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def get_analytics_summary(
    period: str = Query("month", description="'month' or 'year'"),
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    # Revenue by payment type
    type_breakdown = {}
    for (ptype, total) in (
        db.query(Payment.type, func.sum(Payment.amount))
        .filter(Payment.tailor_id == tailor.id)
        .group_by(Payment.type)
        .all()
    ):
        type_breakdown[ptype] = float(total)

    # Order status breakdown
    status_breakdown = {}
    for (status, count) in (
        db.query(Order.status, func.count(Order.id))
        .filter(Order.tailor_id == tailor.id)
        .group_by(Order.status)
        .all()
    ):
        status_breakdown[status] = int(count)

    # Method breakdown
    method_breakdown = {}
    for (method, total) in (
        db.query(Payment.method, func.sum(Payment.amount))
        .filter(Payment.tailor_id == tailor.id)
        .group_by(Payment.method)
        .all()
    ):
        method_breakdown[method] = float(total)

    return {
        "type_breakdown":   type_breakdown,
        "status_breakdown": status_breakdown,
        "method_breakdown": method_breakdown,
    }


@router.get("/revenue", response_model=List[RevenuePoint])
def get_revenue(
    period: str = Query("month"),
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Monthly revenue for the last 12 months."""
    rows = (
        db.query(
            extract("year",  Payment.date).label("yr"),
            extract("month", Payment.date).label("mo"),
            func.sum(Payment.amount).label("total"),
        )
        .filter(Payment.tailor_id == tailor.id)
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .limit(12)
        .all()
    )
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return [
        RevenuePoint(
            month=f"{months[int(r.mo)-1]} {int(r.yr)}",
            amount=float(r.total),
        )
        for r in rows
    ]


@router.get("/popular-garments")
def get_popular_garments(
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Top 8 most ordered garment types by order count and revenue."""
    rows = (
        db.query(
            Order.garment,
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
        )
        .outerjoin(Payment, (Payment.order_id == Order.id) & (Payment.tailor_id == tailor.id))
        .filter(Order.tailor_id == tailor.id)
        .group_by(Order.garment)
        .order_by(func.count(Order.id).desc())
        .limit(8)
        .all()
    )
    return [
        {
            "garment": r.garment,
            "count":   int(r.count),
            "revenue": float(r.revenue),
        }
        for r in rows
    ]


@router.get("/top-customers", response_model=List[TopCustomer])
def get_top_customers(
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Top 10 customers by total spending."""
    rows = (
        db.query(
            Customer.id,
            Customer.name,
            func.coalesce(func.sum(Payment.amount), 0).label("total_spent"),
            func.count(Order.id.distinct()).label("orders"),
        )
        .outerjoin(Order,   (Order.customer_id == Customer.id) & (Order.tailor_id == tailor.id))
        .outerjoin(Payment, (Payment.order_id  == Order.id)    & (Payment.tailor_id == tailor.id))
        .filter(Customer.tailor_id == tailor.id)
        .group_by(Customer.id, Customer.name)
        .order_by(func.sum(Payment.amount).desc().nullslast())
        .limit(10)
        .all()
    )
    return [
        TopCustomer(
            id=str(r.id),
            name=r.name,
            total_spent=float(r.total_spent),
            orders=int(r.orders),
        )
        for r in rows
    ]
