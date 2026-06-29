"""
routers/auth.py — Authentication routes.
Handles citizen registration, login, OTP verification, and admin login.
All flows produce a simulated OTP (shown in SMS widget on frontend).
"""
import random
from datetime import datetime
from fastapi import APIRouter, HTTPException

from backend.db import read_users, write_users, pending_verifications
from backend.models import RegisterRequest, LoginRequest, VerifyRequest, AdminLoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _generate_otp() -> str:
    return str(random.randint(1000, 9999))


# ── Register ────────────────────────────────────────────────────────────────
@router.post("/register")
def register(body: RegisterRequest):
    if not all([body.username, body.email, body.phone, body.idType, body.idNumber]):
        raise HTTPException(400, "All fields are required")

    users = read_users()
    existing = next(
        (u for u in users if u.get("phone") == body.phone
         or u.get("username", "").lower() == body.username.lower()),
        None,
    )
    if existing and existing.get("verified"):
        raise HTTPException(400, "Username or Phone already registered. Try logging in.")

    otp = _generate_otp()
    pending_verifications[body.phone] = {
        "username": body.username,
        "email":    body.email,
        "phone":    body.phone,
        "idType":   body.idType,
        "idNumber": body.idNumber,
        "role":     "citizen",   # always citizen via public form
        "otp":      otp,
        "isLogin":  False,
    }

    print(f"[SMS Sim] Register OTP for {body.phone} ({body.username}): {otp}")
    return {"success": True, "phone": body.phone, "simulatedOtp": otp, "isLogin": False}


# ── Login ────────────────────────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest):
    if not body.phone:
        raise HTTPException(400, "Phone number is required")

    users = read_users()
    user = next((u for u in users if u.get("phone") == body.phone), None)
    if not user or not user.get("verified"):
        raise HTTPException(404, "Phone number not registered. Please register first.")

    otp = _generate_otp()
    pending_verifications[body.phone] = {
        "username": user["username"],
        "email":    user.get("email", ""),
        "phone":    user["phone"],
        "idType":   user.get("idType", "Aadhaar Card"),
        "idNumber": user.get("idNumber", ""),
        "role":     user.get("role", "citizen"),
        "otp":      otp,
        "isLogin":  True,
    }

    print(f"[SMS Sim] Login OTP for {body.phone} ({user['username']}): {otp}")
    return {"success": True, "phone": body.phone, "simulatedOtp": otp, "isLogin": True}


# ── Verify OTP ──────────────────────────────────────────────────────────────
@router.post("/verify")
def verify(body: VerifyRequest):
    if not body.phone or not body.otp:
        raise HTTPException(400, "Phone and OTP are required")

    pending = pending_verifications.get(body.phone)
    if not pending:
        raise HTTPException(404, "No pending session for this phone number")

    if pending["otp"] != str(body.otp):
        raise HTTPException(400, "Invalid OTP code")

    users = read_users()

    if pending["isLogin"]:
        existing = next((u for u in users if u.get("phone") == body.phone), None)
        pending_verifications.pop(body.phone, None)
        return {"success": True, "user": existing}

    # New registration — persist user
    filtered = [u for u in users if u.get("phone") != body.phone]
    new_user = {
        "username": pending["username"],
        "email":    pending["email"],
        "phone":    pending["phone"],
        "idType":   pending["idType"],
        "idNumber": pending["idNumber"],
        "role":     pending["role"],
        "verified": True,
        "xp":       50,
        "points":   50,
        "badge":    "Civic Novice",
    }
    filtered.append(new_user)
    write_users(filtered)
    pending_verifications.pop(body.phone, None)

    print(f"[Auth] New citizen registered: {new_user['username']}")
    return {"success": True, "user": new_user}


# ── Admin Login ──────────────────────────────────────────────────────────────
@router.post("/admin-login")
def admin_login(body: AdminLoginRequest):
    if not body.username or not body.phone:
        raise HTTPException(400, "Username and phone are required")

    users = read_users()
    admins = [u for u in users if u.get("role") == "admin"]
    admin_user = next(
        (u for u in admins if u.get("username", "").lower() == body.username.lower()),
        None,
    )

    if not admin_user:
        if admins:
            raise HTTPException(403, "Unrecognized admin username. Contact your administrator.")
        # Bootstrap first-ever admin
        admin_user = {
            "username": body.username,
            "email":    f"{body.username.lower()}@civiverse.gov.in",
            "phone":    body.phone,
            "idType":   "Government ID",
            "idNumber": f"GOV-{random.randint(100000, 999999)}",
            "role":     "admin",
            "verified": True,
            "xp":       0,
            "points":   0,
            "badge":    "Municipal Officer",
        }
        users.append(admin_user)
        write_users(users)
        print(f"[Admin] First admin bootstrapped: {body.username}")
    else:
        admin_user["phone"] = body.phone
        write_users(users)

    otp = _generate_otp()
    pending_verifications[body.phone] = {
        "username": admin_user["username"],
        "email":    admin_user.get("email", ""),
        "phone":    body.phone,
        "idType":   admin_user.get("idType", "Government ID"),
        "idNumber": admin_user.get("idNumber", ""),
        "role":     "admin",
        "otp":      otp,
        "isLogin":  True,
    }

    print(f"[Admin SMS Sim] OTP for {body.username} ({body.phone}): {otp}")
    return {"success": True, "phone": body.phone, "simulatedOtp": otp, "isLogin": True}
