import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import Base, engine
from routers import auth, customers, orders, payments, appointments, analytics, dashboard, admin

load_dotenv()

# ── Create tables on startup ──────────────────────────────────────
# In production you'd use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="TailorFlow API",
    description="Multi-tailor SaaS backend for the TailorFlow business dashboard.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(appointments.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(admin.router)


# ── Health check ──────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "TailorFlow API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
