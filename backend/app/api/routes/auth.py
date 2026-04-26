import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import PasswordResetConfirm, PasswordResetRequest, TokenResponse, UserLogin, UserRegister
from app.services.email import build_password_reset_email, send_email


router = APIRouter(prefix="/auth", tags=["auth"])

_RESET_TOKEN_TTL_MINUTES = 30


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/password-reset")
async def request_password_reset(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = str(uuid.uuid4())
        user.password_reset_token = token
        user.password_reset_token_expires_at = datetime.now(UTC) + timedelta(minutes=_RESET_TOKEN_TTL_MINUTES)
        db.add(user)
        db.commit()

        settings = get_settings()
        reset_url = f"{settings.frontend_url}/password-reset/confirm?token={token}"
        background_tasks.add_task(
            send_email,
            user.email,
            "Redefinir sua senha — App do Baba",
            build_password_reset_email(reset_url),
        )

    return {"message": "Se este e-mail estiver cadastrado, você receberá um link de redefinição em breve"}


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == payload.token).first()
    if not user or not user.password_reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    if datetime.now(UTC) > user.password_reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Token de redefinição expirado")
    user.password_hash = get_password_hash(payload.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    db.add(user)
    db.commit()
    return {"message": "Senha atualizada com sucesso"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email, "full_name": current_user.full_name}
