"""
Authentication Schemas
Pydantic models for authentication requests/responses
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"


class UserLogin(BaseModel):
    """User login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserRegister(BaseModel):
    """User registration request"""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STUDENT


class UserResponse(BaseModel):
    """User response model"""
    id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class CurrentUser(BaseModel):
    """Current authenticated user"""
    id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    is_active: bool


class TokenResponse(BaseModel):
    """Token response after login"""
    access_token: str
    token_type: str
    user: CurrentUser
