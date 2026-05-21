import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models import Tailor, Customer, Order, Payment
from schemas import AdminTailorOut, AdminStats, AdminPromoteRequest
from auth.dependencies import get_current_tailor, get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "tailorflow-admin-secret")


@router.get("/stats", response_model=AdminStats)
def get_stats(
    admin: Tailor = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return AdminStats(
        total_tailors=   int(db.query(func.count(Tailor.id)).scalar() or 0),
        active_tailors=  int(db.query(func.count(Tailor.id)).filter(Tailor.is_active == True).scalar() or 0),
        total_customers= int(db.query(func.count(Customer.id)).scalar() or 0),
        total_orders=    int(db.query(func.count(Order.id)).scalar() or 0),
        total_revenue=   float(db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0),
    )


@router.get("/tailors", response_model=List[AdminTailorOut])
def list_tailors(
    admin: Tailor = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tailors = db.query(Tailor).order_by(Tailor.created_at.desc()).all()
    result = []
    for t in tailors:
        result.append(AdminTailorOut(
            id=t.id,
            name=t.name,
            business_name=t.business_name,
            email=t.email,
            phone=t.phone,
            is_admin=t.is_admin,
            is_active=t.is_active,
            created_at=t.created_at,
            customers_count=int(db.query(func.count(Customer.id)).filter(Customer.tailor_id == t.id).scalar() or 0),
            orders_count=   int(db.query(func.count(Order.id)).filter(Order.tailor_id == t.id).scalar() or 0),
            total_revenue=  float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.tailor_id == t.id).scalar() or 0),
        ))
    return result


@router.patch("/tailors/{tailor_id}/deactivate", response_model=AdminTailorOut)
def deactivate_tailor(
    tailor_id: str,
    admin: Tailor = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tailor).filter(Tailor.id == tailor_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tailor not found.")
    if t.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    if t.is_admin:
        raise HTTPException(status_code=400, detail="Cannot deactivate another admin account.")
    t.is_active = False
    db.commit()
    db.refresh(t)
    return _serialize(t, db)


@router.patch("/tailors/{tailor_id}/reactivate", response_model=AdminTailorOut)
def reactivate_tailor(
    tailor_id: str,
    admin: Tailor = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tailor).filter(Tailor.id == tailor_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tailor not found.")
    t.is_active = True
    db.commit()
    db.refresh(t)
    return _serialize(t, db)


@router.post("/promote")
def promote_to_admin(
    payload: AdminPromoteRequest,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    """Promote the currently authenticated tailor to admin using ADMIN_SECRET."""
    if payload.secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret.")
    tailor.is_admin = True
    db.commit()
    return {"message": f"{tailor.name} is now an admin."}


def _serialize(t: Tailor, db: Session) -> AdminTailorOut:
    return AdminTailorOut(
        id=t.id,
        name=t.name,
        business_name=t.business_name,
        email=t.email,
        phone=t.phone,
        is_admin=t.is_admin,
        is_active=t.is_active,
        created_at=t.created_at,
        customers_count=int(db.query(func.count(Customer.id)).filter(Customer.tailor_id == t.id).scalar() or 0),
        orders_count=   int(db.query(func.count(Order.id)).filter(Order.tailor_id == t.id).scalar() or 0),
        total_revenue=  float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.tailor_id == t.id).scalar() or 0),
    )
