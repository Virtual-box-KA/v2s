"""
routers/admin.py — Admin-only user and issue management, plus MO employee management.
"""
from datetime import datetime, timezone
import math
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
        issue["status"] = "In Progress"
        ts = datetime.now(timezone.utc).isoformat()

        # Assignment timeline note
        issue.setdefault("timeline", []).append({
            "status": "In Progress",
            "timestamp": ts,
            "note": f"Assigned to {emp['username']}",
            "image": None,
        })

        write_issues(issues)

    print(f"[Admin] Issue #{issue_id} assigned to {emp['username']} by {body.assignedBy or 'admin'}")
    return {"success": True, "assignedIssues": assigned, "assignedTo": emp["username"]}


# ── Deduplication & Merging Logic ─────────────────────────────────────────────
def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in meters using flat-earth approximation."""
    # Approximate Earth radius in meters
    R = 6371000.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    # Flat surface projection approximation for local distances
    x = delta_lng * math.cos((lat1_rad + lat2_rad) / 2.0)
    y = delta_lat
    return math.sqrt(x*x + y*y) * R


@router.get("/issues/{issue_id}/duplicates")
def get_duplicates(issue_id: int):
    issues = read_issues()
    main_issue = next((i for i in issues if i["id"] == issue_id), None)
    if not main_issue:
        raise HTTPException(404, "Issue not found")
        
    main_lat = main_issue.get("location", {}).get("lat")
    main_lng = main_issue.get("location", {}).get("lng")
    main_category = main_issue.get("category")
    main_city = main_issue.get("city")
    
    if main_lat is None or main_lng is None:
        return []
        
    duplicates = []
    for issue in issues:
        # Exclude itself and already merged/resolved/duplicate issues
        if issue["id"] == issue_id or issue.get("status") in ("Resolved", "Duplicate"):
            continue
            
        # Same city and same category check
        if (issue.get("city", "").lower() == main_city.lower() and 
            issue.get("category", "").lower() == main_category.lower()):
            
            lat = issue.get("location", {}).get("lat")
            lng = issue.get("location", {}).get("lng")
            if lat is not None and lng is not None:
                dist = calculate_distance(main_lat, main_lng, lat, lng)
                # Within 200 meters threshold
                if dist <= 200.0:
                    duplicates.append({
                        "id": issue["id"],
                        "title": issue["title"],
                        "createdBy": issue.get("createdBy", "Anonymous"),
                        "createdAt": issue.get("createdAt"),
                        "status": issue.get("status"),
                        "upvotes": issue.get("upvotes", 0),
                        "distance": round(dist, 1)
                    })
                    
    return duplicates


@router.post("/issues/{issue_id}/merge/{dup_id}")
def merge_issue(issue_id: int, dup_id: int):
    issues = read_issues()
    main_issue = next((i for i in issues if i["id"] == issue_id), None)
    dup_issue = next((i for i in issues if i["id"] == dup_id), None)
    
    if not main_issue:
        raise HTTPException(404, "Main issue not found")
    if not dup_issue:
        raise HTTPException(404, "Duplicate issue not found")
        
    ts = datetime.now(timezone.utc).isoformat()
    
    # 1. Merge unique upvoters and sum upvotes
    main_upvoted_by = set(main_issue.get("upvotedBy", []))
    dup_upvoted_by = set(dup_issue.get("upvotedBy", []))
    
    # Add duplicate creator as upvoter if not already present
    if dup_issue.get("createdBy"):
        dup_upvoted_by.add(dup_issue["createdBy"])
        
    merged_upvoters = main_upvoted_by.union(dup_upvoted_by)
    main_issue["upvotedBy"] = list(merged_upvoters)
    main_issue["upvotes"] = len(merged_upvoters)
    
    # 2. Merge comments
    main_comments = main_issue.setdefault("comments", [])
    dup_comments = dup_issue.get("comments", [])
    
    # Keep track of next comment ID
    next_comment_id = max((c["id"] for c in main_comments), default=200) + 1
    for comment in dup_comments:
        main_comments.append({
            "id": next_comment_id,
            "user": comment.get("user", "Anonymous"),
            "text": f"[From Duplicate Issue #{dup_id}] {comment.get('text', '')}",
            "timestamp": comment.get("timestamp", ts)
        })
        next_comment_id += 1
        
    # 3. Log merging in main issue timeline
    main_issue.setdefault("timeline", []).append({
        "status": main_issue.get("status", "In Progress"),
        "timestamp": ts,
        "note": f"Merged duplicate issue #{dup_id} reported by {dup_issue.get('createdBy', 'Anonymous')}. Consolidated comments and upvotes (New Total: {main_issue['upvotes']} upvotes).",
        "image": None
    })
    
    # 4. Update duplicate issue status to Duplicate
    dup_issue["status"] = "Duplicate"
    dup_issue.setdefault("timeline", []).append({
        "status": "Duplicate",
        "timestamp": ts,
        "note": f"Issue marked as duplicate of #{issue_id} and closed.",
        "image": None
    })
    
    write_issues(issues)
    print(f"[Admin] Merged duplicate issue #{dup_id} into issue #{issue_id}")
    return main_issue
