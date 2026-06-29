"""
models.py — All Pydantic request/response schemas.
"""
from typing import Optional, List
from pydantic import BaseModel


# ── Auth ────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    phone: str
    idType: str
    idNumber: str
    role: Optional[str] = "citizen"


class LoginRequest(BaseModel):
    phone: str


class VerifyRequest(BaseModel):
    phone: str
    otp: str


class AdminLoginRequest(BaseModel):
    username: str
    phone: str


# ── XP Sync ─────────────────────────────────────────────────────────────────
class XPSyncRequest(BaseModel):
    xpGained: int


# ── AI ──────────────────────────────────────────────────────────────────────
class CategorizeRequest(BaseModel):
    image: str  # base64 data URL


# ── Issues ──────────────────────────────────────────────────────────────────
class LocationBody(BaseModel):
    address: Optional[str] = "Unknown Location"
    lat: Optional[float] = 28.7712
    lng: Optional[float] = 77.4725


class CreateIssueRequest(BaseModel):
    title: str
    description: str
    category: str
    location: LocationBody
    severity: str
    city: str
    image: Optional[str] = None
    createdBy: Optional[str] = "Anonymous Citizen"


class VerifyIssueRequest(BaseModel):
    user: str


class StatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None
    image: Optional[str] = None


class AddCommentRequest(BaseModel):
    user: str
    text: str


# ── Admin ────────────────────────────────────────────────────────────────────
class CreateUserRequest(BaseModel):
    username: str
    phone: str
    email: Optional[str] = ""
    idType: Optional[str] = "Aadhaar Card"
    idNumber: Optional[str] = ""
