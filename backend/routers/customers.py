from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Tailor, Customer
from schemas import CustomerCreate, CustomerUpdate, CustomerOut
from auth.dependencies import get_current_tailor

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=List[CustomerOut])
def list_customers(
    q: Optional[str] = Query(None, description="Search by name, phone or email"),
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    query = db.query(Customer).filter(Customer.tailor_id == tailor.id)
    if q:
        search = f"%{q.lower()}%"
        query = query.filter(
            Customer.name.ilike(search) |
            Customer.phone.ilike(search) |
            Customer.email.ilike(search)
        )
    customers = query.order_by(Customer.created_at.desc()).all()
    return [_serialize(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    c = _get_or_404(db, tailor.id, customer_id)
    return _serialize(c)


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(
    payload: CustomerCreate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    customer = Customer(tailor_id=tailor.id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _serialize(customer)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    c = _get_or_404(db, tailor.id, customer_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    c = _get_or_404(db, tailor.id, customer_id)
    db.delete(c)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────
def _get_or_404(db: Session, tailor_id: str, customer_id: str) -> Customer:
    from fastapi import HTTPException
    c = db.query(Customer).filter(
        Customer.tailor_id == tailor_id,
        Customer.id == customer_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return c


def _serialize(c: Customer) -> CustomerOut:
    return CustomerOut(
        id=c.id,
        name=c.name,
        phone=c.phone,
        email=c.email,
        measurements=c.measurements,
        orders_count=len(c.orders),
        total_spent=float(sum(
            p.amount for o in c.orders for p in o.payments
        )),
        created_at=c.created_at,
    )
