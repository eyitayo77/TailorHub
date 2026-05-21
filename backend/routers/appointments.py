from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models import Tailor, Appointment, Customer
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentOut
from auth.dependencies import get_current_tailor

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    appts = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer))
        .filter(Appointment.tailor_id == tailor.id)
        .order_by(Appointment.date.asc(), Appointment.time.asc())
        .all()
    )
    return [_serialize(a) for a in appts]


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    if payload.customer_id:
        cust = db.query(Customer).filter(
            Customer.id == payload.customer_id,
            Customer.tailor_id == tailor.id,
        ).first()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found.")

    appt = Appointment(tailor_id=tailor.id, **payload.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)

    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer))
        .filter(Appointment.id == appt.id)
        .first()
    )
    return _serialize(appt)


@router.put("/{appt_id}", response_model=AppointmentOut)
def update_appointment(
    appt_id: str,
    payload: AppointmentUpdate,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    a = _get_or_404(db, tailor.id, appt_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(a, field, value)
    db.commit()
    db.refresh(a)
    return _serialize(a)


@router.delete("/{appt_id}", status_code=204)
def delete_appointment(
    appt_id: str,
    tailor: Tailor = Depends(get_current_tailor),
    db: Session = Depends(get_db),
):
    a = _get_or_404(db, tailor.id, appt_id)
    db.delete(a)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────
def _get_or_404(db: Session, tailor_id: str, appt_id: str) -> Appointment:
    a = db.query(Appointment).filter(
        Appointment.tailor_id == tailor_id,
        Appointment.id == appt_id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return a


def _serialize(a: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=a.id,
        customer_id=a.customer_id,
        customer_name=a.customer.name if a.customer else "—",
        type=a.type,
        date=a.date,
        time=a.time,
        note=a.note,
        created_at=a.created_at,
    )
