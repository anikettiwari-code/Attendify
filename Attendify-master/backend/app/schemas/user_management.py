"""User management schemas with strict RBAC contracts."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    """Admin-only user creation payload."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STUDENT
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: bool = True


class UserRead(BaseModel):
    """User data returned to clients (no secrets)."""
    id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: list[UserRead]


class UserDeleteResponse(BaseModel):
    message: str
    deleted_user_id: int
