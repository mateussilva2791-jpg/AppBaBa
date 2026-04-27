import uuid
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.enums import LeagueRole
from app.models.league import LeagueMember
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_user_from_token(token: str, db: Session) -> User:
    settings = get_settings()
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if not subject:
            raise auth_error
    except JWTError as exc:
        raise auth_error from exc

    user = db.get(User, uuid.UUID(subject))
    if not user or not user.is_active:
        raise auth_error
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = get_user_from_token(token, db)
    user.last_seen_at = datetime.now(UTC)
    db.commit()
    return user


def get_current_league_member(
    league_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LeagueMember:
    member = (
        db.query(LeagueMember)
        .filter(
            LeagueMember.league_id == league_id,
            LeagueMember.user_id == current_user.id,
            LeagueMember.is_active.is_(True),
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this league")
    return member


def require_league_role(*roles: LeagueRole):
    def dependency(member: LeagueMember = Depends(get_current_league_member)) -> LeagueMember:
        if member.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this league")
        return member

    return dependency
