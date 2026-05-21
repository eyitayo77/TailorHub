from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from database import get_db
from models import Tailor
from auth.utils import decode_token

bearer_scheme = HTTPBearer()


def get_current_tailor(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Tailor:
    """
    Validates the Bearer JWT and returns the matching Tailor row.
    Raises 401 if the token is missing, invalid, or expired.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        tailor_id: str = payload.get("sub")
        if not tailor_id:
            raise ValueError("No sub in token")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tailor = db.query(Tailor).filter(Tailor.id == tailor_id).first()
    if not tailor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )
    if not tailor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact support.",
        )
    return tailor


def get_current_admin(
    tailor: Tailor = Depends(get_current_tailor),
) -> Tailor:
    """Same as get_current_tailor but also requires is_admin = True."""
    if not tailor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return tailor
