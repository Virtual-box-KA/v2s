"""
routers/admin.py — Admin-only user and issue management, plus MO employee management.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.db import read_users, write_users, read_issues, write_issues
from backend.models import CreateUserRequest

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _mask_id(user: dict) -> dict:
    """Return a copy of the user with the ID number partially masked."""
    masked = dict(user)
    raw = masked.get("idNumber", "")
    masked["idNumber"] = ("****" + raw[-4:]) if raw else "****"
    return masked


# ── GET all users ────────────────────────────────────────────────────────────
@router.get("/users")
def get_users(username: Optional[str] = None):
    users = read_users()
    # If MO admin, only return employees of their city
    if username and username not in ("null", "undefined", "") and username.startswith("mo-"):
        city = username[3:].replace("-", " ").lower()
        return [_mask_id(u) for u in users if u.get("municipalOffice", "").lower() == city]
    return [_mask_id(u) for u in users]


# ── POST create citizen account ──────────────────────────────────────────────
@router.post("/users", status_code=201)
def create_user(body: CreateUserRequest):
    if not body.username or not body.phone:
        raise HTTPException(400, "Username and phone are required")

    users = read_users()
    exists = next(
        (u for u in users
         if u.get("phone") == body.phone
         or u.get("username", "").lower() == body.username.lower()),
        None,
    )
    if exists:
        raise HTTPException(400, "Username or phone already registered")

    new_user = {
        "username": body.username,
        "email":    body.email or "",
        "phone":    body.phone,
        "idType":   body.idType or "Aadhaar Card",
        "idNumber": body.idNumber or "",
        "role":     "citizen",
        "verified": True,
        "xp":       50,
        "points":   50,
        "badge":    "Civic Novice",
    }
    users.append(new_user)
    write_users(users)
    print(f"[Admin] Created citizen account: {body.username} ({body.phone})")
    return new_user


# ── DELETE user ──────────────────────────────────────────────────────────────
@router.delete("/users/{phone}")
def delete_user(phone: str):
    users = read_users()
    filtered = [u for u in users if u.get("phone") != phone]
    if len(filtered) == len(users):
        raise HTTPException(404, "User not found")
    write_users(filtered)
    return {"success": True}


# ── DELETE issue ─────────────────────────────────────────────────────────────
@router.delete("/issues/{issue_id}")
def delete_issue(issue_id: int):
    issues = read_issues()
    filtered = [i for i in issues if i["id"] != issue_id]
    if len(filtered) == len(issues):
        raise HTTPException(404, "Issue not found")
    write_issues(filtered)
    return {"success": True}


# ════════════════════════════════════════════════════════════════════════════
# EMPLOYEE MANAGEMENT (for MO admins)
# ════════════════════════════════════════════════════════════════════════════

class CreateEmployeeRequest(BaseModel):
    username: str
    phone: str
    email: Optional[str] = ""
    department: Optional[str] = "General"
    municipalOffice: str  # e.g. "ghaziabad"


# ── GET employees for an MO city ─────────────────────────────────────────────
@router.get("/employees")
def get_employees(municipalOffice: str):
    users = read_users()
    city = municipalOffice.lower()
    return [
        _mask_id(u) for u in users
        if u.get("role") == "employee" and u.get("municipalOffice", "").lower() == city
    ]


# ── POST create employee account ─────────────────────────────────────────────
@router.post("/employees", status_code=201)
def create_employee(body: CreateEmployeeRequest):
    if not body.username or not body.phone:
        raise HTTPException(400, "Username and phone are required")

    users = read_users()
    exists = next(
        (u for u in users
         if u.get("phone") == body.phone
         or u.get("username", "").lower() == body.username.lower()),
        None,
    )
    if exists:
        raise HTTPException(400, "Username or phone already registered")

    city = body.municipalOffice.lower()
    new_emp = {
        "username":       body.username,
        "email":          body.email or f"{body.username.replace(' ', '.').lower()}@{city}.gov.in",
        "phone":          body.phone,
        "idType":         "Government ID",
        "idNumber":       f"EMP-{city.upper()}-{body.phone[-4:]}",
        "role":           "employee",
        "municipalOffice": city,
        "department":     body.department,
        "verified":       True,
        "xp":             0,
        "points":         0,
        "badge":          "Field Officer",
        "assignedIssues": [],
    }
    users.append(new_emp)
    write_users(users)
    print(f"[Admin] Created employee: {body.username} for {city}")
    return new_emp


# ── DELETE employee ───────────────────────────────────────────────────────────
@router.delete("/employees/{phone}")
def delete_employee(phone: str):
    users = read_users()
    target = next((u for u in users if u.get("phone") == phone and u.get("role") == "employee"), None)
    if not target:
        raise HTTPException(404, "Employee not found")
    write_users([u for u in users if u.get("phone") != phone or u.get("role") != "employee"])
    return {"success": True}


# ── POST assign issue to employee ─────────────────────────────────────────────
class AssignIssueBody(BaseModel):
    assignedBy: Optional[str] = ""


@router.post("/employees/{phone}/assign/{issue_id}")
def assign_issue(phone: str, issue_id: int, body: AssignIssueBody = None):
    if body is None:
        body = AssignIssueBody()

    users = read_users()
    emp = next((u for u in users if u.get("phone") == phone and u.get("role") == "employee"), None)
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Add to employee's assigned issues list
    assigned = emp.get("assignedIssues", [])
    if issue_id not in assigned:
        assigned.append(issue_id)
        emp["assignedIssues"] = assigned
        write_users(users)

    # Update the issue: set assignedTo + append timeline entry
    issues = read_issues()
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if issue:
        issue["assignedTo"] = emp["username"]
        ts = datetime.now(timezone.utc).isoformat()

        # Assignment timeline note
        assign_note = f"Assigned to {emp['username']} ({emp.get('department', 'General')})"
        if body.assignedBy:
            assign_note += f" by {body.assignedBy}"
        issue.setdefault("timeline", []).append({
            "status": issue.get("status", "Open"),
            "timestamp": ts,
            "note": assign_note,
            "image": None,
        })

        # Auto-advance to In Progress if still Open
        if issue.get("status") == "Open":
            issue["status"] = "In Progress"
            issue["timeline"].append({
                "status": "In Progress",
                "timestamp": ts,
                "note": "Status updated to In Progress — work has been assigned to a field officer.",
                "image": None,
            })

        write_issues(issues)

    print(f"[Admin] Issue #{issue_id} assigned to {emp['username']} by {body.assignedBy or 'admin'}")
    return {"success": True, "assignedIssues": assigned, "assignedTo": emp["username"]}
