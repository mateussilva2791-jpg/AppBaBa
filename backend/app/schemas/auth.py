import re

from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password_complexity(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("A senha deve conter pelo menos uma letra maiúscula")
    if not re.search(r"[0-9]", v):
        raise ValueError("A senha deve conter pelo menos um número")
    return v


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_complexity(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_complexity(v)
