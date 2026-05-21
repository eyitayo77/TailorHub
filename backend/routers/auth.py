import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from models import Tailor
from schemas import RegisterRequest, LoginRequest, AuthResponse, TailorOut, ForgotPasswordRequest, ResetPasswordRequest
from auth.utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")


def send_reset_email(to_email: str, to_name: str, reset_link: str):
    """Send password reset email via Resend. Falls back to console log if no API key."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print(f"\n[DEV] Password reset link for {to_email}:\n{reset_link}\n")
        return

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": "Tailor Hub <noreply@tailorhub.app>",
            "to":   [to_email],
            "subject": "Reset your Tailor Hub password",
            "html": f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
              <div style="margin-bottom:24px;">
                <span style="font-size:20px;font-weight:700;color:#534AB7;">Tailor</span>
                <span style="font-size:20px;font-weight:700;color:#1A1A18;">Hub</span>
              </div>
              <h2 style="font-size:22px;color:#1A1A18;margin-bottom:8px;">Reset your password</h2>
              <p style="color:#5F5E5A;font-size:15px;margin-bottom:24px;">
                Hi {to_name}, click the button below to set a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <a href="{reset_link}" style="display:inline-block;background:#534AB7;color:#fff;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">
                Reset password
              </a>
              <p style="color:#888780;font-size:13px;margin-top:24px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            """
        })
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        print(f"[DEV] Reset link: {reset_link}")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new tailor account."""
    existing = db.query(Tailor).filter(Tailor.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    tailor = Tailor(
        name=payload.name,
        business_name=payload.business_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
    )
    db.add(tailor)
    db.commit()
    db.refresh(tailor)

    token = create_access_token({"sub": str(tailor.id)})
    return AuthResponse(
        access_token=token,
        user=TailorOut.model_validate(tailor),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password, returns a JWT."""
    tailor = db.query(Tailor).filter(Tailor.email == payload.email).first()
    if not tailor or not verify_password(payload.password, tailor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not tailor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact support.",
        )

    token = create_access_token({"sub": str(tailor.id)})
    return AuthResponse(
        access_token=token,
        user=TailorOut.model_validate(tailor),
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token and email it to the user."""
    tailor = db.query(Tailor).filter(Tailor.email == payload.email).first()
    # Always return success to avoid revealing whether email exists
    if not tailor:
        return {"message": "If this email is registered, a reset link has been sent."}

    token   = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)

    tailor.reset_token         = token
    tailor.reset_token_expires = expires
    db.commit()

    reset_link = f"{FRONTEND_URL}/reset.html?token={token}"
    send_reset_email(tailor.email, tailor.name, reset_link)

    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify reset token and update password."""
    tailor = db.query(Tailor).filter(Tailor.reset_token == payload.token).first()

    if not tailor:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    if tailor.reset_token_expires is None or datetime.now(timezone.utc) > tailor.reset_token_expires:
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    tailor.password_hash        = hash_password(payload.password)
    tailor.reset_token          = None
    tailor.reset_token_expires  = None
    db.commit()

    return {"message": "Password updated successfully. You can now log in."}


@router.get("/me", response_model=TailorOut)
def get_me(db: Session = Depends(get_db)):
    """Health-check endpoint — used by frontend to validate token on load."""
    raise HTTPException(status_code=401, detail="Use Authorization header.")
