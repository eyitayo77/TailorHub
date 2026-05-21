from __future__ import annotations
from datetime import date, datetime, time
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ── Auth ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:          str
    business_name: Optional[str] = None
    email:         EmailStr
    password:      str = Field(min_length=6)
    phone:         Optional[str] = None

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token:    str
    password: str = Field(min_length=8)

class TailorOut(BaseModel):
    id:            str
    name:          str
    business_name: Optional[str]
    email:         str
    phone:         Optional[str]
    is_admin:      bool = False
    is_active:     bool = True
    created_at:    Optional[datetime]

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         TailorOut


# ── Customers ─────────────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name:         str
    phone:        Optional[str] = None
    email:        Optional[str] = None
    measurements: Optional[str] = None   # JSON string

class CustomerUpdate(BaseModel):
    name:         Optional[str] = None
    phone:        Optional[str] = None
    email:        Optional[str] = None
    measurements: Optional[str] = None

class CustomerOut(BaseModel):
    id:           str
    name:         str
    phone:        Optional[str]
    email:        Optional[str]
    measurements: Optional[str]
    orders_count: int = 0
    total_spent:  float = 0.0
    created_at:   Optional[datetime]

    class Config:
        from_attributes = True


# ── Orders ────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    garment:     str
    status:      str = "pending"
    due_date:    Optional[date] = None
    total_price: Optional[float] = 0
    notes:       Optional[str] = None

class OrderUpdate(BaseModel):
    garment:     Optional[str] = None
    status:      Optional[str] = None
    due_date:    Optional[date] = None
    total_price: Optional[float] = None
    notes:       Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class OrderOut(BaseModel):
    id:            str
    customer_id:   Optional[str]
    customer_name: str = "—"
    garment:       str
    status:        str
    due_date:      Optional[date]
    total_price:   float = 0
    amount_paid:   float = 0
    balance_due:   float = 0
    notes:         Optional[str]
    created_at:    Optional[datetime]

    class Config:
        from_attributes = True


# ── Payments ──────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    type:   str = "deposit"    # deposit | balance | full
    method: str = "Transfer"   # Transfer | Cash | POS
    date:   Optional[date] = None
    note:   Optional[str] = None

class PaymentOut(BaseModel):
    id:            str
    order_id:      Optional[str]
    customer_name: str = "—"
    garment:       str = "—"
    amount:        float
    type:          str
    method:        str
    date:          Optional[date]
    note:          Optional[str]
    created_at:    Optional[datetime]

    class Config:
        from_attributes = True


# ── Appointments ──────────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    customer_id: Optional[str] = None
    type:        Optional[str] = None
    date:        date
    time:        Optional[time] = None
    note:        Optional[str] = None

class AppointmentUpdate(BaseModel):
    customer_id: Optional[str] = None
    type:        Optional[str] = None
    date:        Optional[date] = None
    time:        Optional[time] = None
    note:        Optional[str] = None

class AppointmentOut(BaseModel):
    id:            str
    customer_id:   Optional[str]
    customer_name: str = "—"
    type:          Optional[str]
    date:          date
    time:          Optional[time]
    note:          Optional[str]
    created_at:    Optional[datetime]

    class Config:
        from_attributes = True


# ── Dashboard & Analytics ─────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_revenue:      float
    active_orders:      int
    customers_count:    int
    pending_payments:   float
    orders_this_month:  int
    revenue_this_month: float

class AdminTailorOut(BaseModel):
    id:              str
    name:            str
    business_name:   Optional[str]
    email:           str
    phone:           Optional[str]
    is_admin:        bool
    is_active:       bool
    created_at:      Optional[datetime]
    customers_count: int = 0
    orders_count:    int = 0
    total_revenue:   float = 0.0

    class Config:
        from_attributes = True

class AdminStats(BaseModel):
    total_tailors:   int
    active_tailors:  int
    total_customers: int
    total_orders:    int
    total_revenue:   float

class AdminPromoteRequest(BaseModel):
    secret: str


class RevenuePoint(BaseModel):
    month:  str
    amount: float

class TopCustomer(BaseModel):
    id:          str
    name:        str
    total_spent: float
    orders:      int
