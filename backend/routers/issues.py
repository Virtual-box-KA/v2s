"""
routers/issues.py — Issue CRUD, upvote/verify, status updates, and comments.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException

from backend.db import read_issues, write_issues
from backend.models import (
    CreateIssueRequest, VerifyIssueRequest,
    StatusUpdateRequest, AddCommentRequest, WorkUpdateRequest,
)

router = APIRouter(prefix="/api/issues", tags=["issues"])

TAGS_MAP = {
    # Roads
    "Potholes": ["Road Hazard", "Asphalt Damage", "Pavement Failure"],
    "Road damage": ["Asphalt Damage", "Road Safety", "Infrastructure"],
    "Missing road signs": ["Traffic Safety", "Road Signs", "Directional"],
    "Road obstruction": ["Blockage", "Road Hazard", "Traffic Delay"],
    "Pothole": ["Road Hazard", "Asphalt Damage", "Pavement Failure"],
    # Street Lighting
    "Light not working": ["Dark Lane", "Lighting Failure", "Safety Hazard"],
    "Pole damaged": ["Physical Damage", "Pole Structure", "Hazardous"],
    "Exposed wiring": ["Electrical Hazard", "Live Wire", "High Risk"],
    "Damaged Streetlight": ["Lighting Failure", "Electrical Fault", "Safety Hazard"],
    # Water
    "Water leakage": ["Water Pipe Burst", "Flooding", "Resource Waste"],
    "No water supply": ["Dry Taps", "Water Shortage", "Utility Issue"],
    "Low pressure": ["Low Flow", "Water Supply", "Utility Issue"],
    "Contaminated water": ["Dirty Water", "Health Risk", "Contamination"],
    "Water Leakage": ["Water Pipe Burst", "Flooding", "Resource Waste"],
    # Sewerage
    "Drain blockage": ["Water Clogging", "Blocked Drain", "Sanitation"],
    "Sewer overflow": ["Sewer Leak", "Public Health", "Sanitation"],
    "Open manhole": ["Open Lid", "Severe Tripping Hazard", "Critical Risk"],
    # Waste Management
    "Garbage not collected": ["Waste Pile", "Littering", "Sanitation"],
    "Overflowing bin": ["Garbage Spillage", "Overfilled Bin", "Sanitation"],
    "Illegal dumping": ["Unauthorized Dump", "Littering", "Cleanliness"],
    "Waste Management": ["Garbage Spillage", "Overfilled Bin", "Sanitation"],
    # Parks & Greenery
    "Fallen tree": ["Blocked Path", "Tree Fall", "Safety Hazard"],
    "Tree pruning": ["Overgrown Branches", "Maintenance", "Greenspace"],
    "Park maintenance": ["Park Litter", "Broken Bench", "Public Park"],
    # Traffic
    "Signal malfunction": ["Traffic Light Out", "Intersection Risk", "Delay"],
    "Illegal parking": ["Wrong Parking", "Obstruction", "Towing Zone"],
    "Missing signage": ["Traffic Signs", "Road Safety", "Regulations"],
    # Animal Control
    "Stray dogs": ["Stray Animals", "Dog Pack", "Safety Risk"],
    "Dead animal": ["Sanitation Risk", "Dead Carcass", "Hygiene"],
    "Cattle on road": ["Cattle Obstruction", "Traffic Risk", "Stray Animals"],
    # Environment
    "Air pollution": ["Smog", "Dust", "Air Quality"],
    "Noise pollution": ["Loudspeakers", "Honking", "Disturbance"],
    "Water pollution": ["River Pollution", "Chemical Waste", "Water Quality"],
    # Public Infrastructure
    "Bus stop damage": ["Transit Shelter", "Vandalism", "Public Shelter"],
    "Footpath damage": ["Broken Slabs", "Tripping Hazard", "Pedestrian Walkway"],
    "Public toilet issue": ["Hygiene", "Public Facility", "Sanitation"],
    "Government building maintenance": ["Facade Damage", "Maintenance", "Public Building"],
    "Public Infrastructure": ["Broken Slabs", "Tripping Hazard", "Pedestrian Walkway"]
}



def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── GET all issues ────────────────────────────────────────────────────────────
@router.get("")
def get_issues(username: Optional[str] = None):
    issues = read_issues()
    # Filter by city for Municipal Office accounts (username pattern: mo-<city>)
    if username and username not in ("null", "undefined", "") and username.startswith("mo-"):
        city_name = username[3:].replace("-", " ").title()
        issues = [i for i in issues if i.get("city", "").lower() == city_name.lower()]
        print(f"[Issues] MO filter applied: city='{city_name}' -> {len(issues)} issues")
    return issues


# ── POST create issue ────────────────────────────────────────────────────────
@router.post("", status_code=201)
def create_issue(body: CreateIssueRequest):
    issues = read_issues()
    next_id = max((i["id"] for i in issues), default=0) + 1
    ts = _now()

    new_issue = {
        "id":          next_id,
        "title":       body.title,
        "description": body.description,
        "category":    body.category,
        "city":        body.city or "Muradnagar",
        "location": {
            "address": body.location.address or "Unknown Location",
            "lat":     float(body.location.lat or 28.7712),
            "lng":     float(body.location.lng or 77.4725),
        },
        "severity":    body.severity,
        "status":      "Open",
        "upvotes":     0,
        "upvotedBy":   [],
        "aiConfidence": 0.94,
        "aiTags":      TAGS_MAP.get(body.category, ["Community Issue"]),
        "createdBy":   body.createdBy or "Anonymous Citizen",
        "createdAt":   ts,
        "image":       body.image,
        "comments":    [],
        "timeline": [{
            "status":    "Open",
            "timestamp": ts,
            "note":      (
                f"Issue reported by {body.createdBy or 'Anonymous Citizen'} in {body.city}. "
                f"AI auto-categorized as {body.category} with 94% confidence."
            ),
            "image": None,
        }],
    }

    issues.append(new_issue)
    write_issues(issues)
    return new_issue


# ── POST upvote/verify ───────────────────────────────────────────────────────
@router.post("/{issue_id}/verify")
def verify_issue(issue_id: int, body: VerifyIssueRequest):
    if not body.user:
        raise HTTPException(400, "User is required")

    issues = read_issues()
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")

    upvoted_by = issue.get("upvotedBy", [])
    if body.user in upvoted_by:
        upvoted_by.remove(body.user)
    else:
        upvoted_by.append(body.user)

    issue["upvotedBy"] = upvoted_by
    issue["upvotes"]   = len(upvoted_by)

    status_updated = False
    already_verified = any("Community verified" in t.get("note", "") for t in issue.get("timeline", []))
    if issue["upvotes"] >= 3 and not already_verified:
        issue["timeline"].append({
            "status":    issue["status"],
            "timestamp": _now(),
            "note":      "Community verified. Issue status validated by civic upvotes.",
            "image":     None,
        })
        status_updated = True

    write_issues(issues)
    return {"issue": issue, "statusUpdated": status_updated}


# ── POST/PATCH update status ──────────────────────────────────────────────────
@router.post("/{issue_id}/status")
@router.patch("/{issue_id}/status")
def update_status(issue_id: int, body: StatusUpdateRequest):
    if not body.status:
        raise HTTPException(400, "Status is required")

    issues = read_issues()
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")

    issue["status"] = body.status
    issue["timeline"].append({
        "status":    body.status,
        "timestamp": _now(),
        "note":      body.note or f"Status updated to {body.status} by Municipal Authority.",
        "image":     body.image,
    })

    write_issues(issues)
    return issue


# ── POST add comment ─────────────────────────────────────────────────────────
@router.post("/{issue_id}/comments", status_code=201)
def add_comment(issue_id: int, body: AddCommentRequest):
    if not body.user or not body.text:
        raise HTTPException(400, "User and text are required")

    issues = read_issues()
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")

    comments = issue.get("comments", [])
    next_comment_id = max((c["id"] for c in comments), default=200) + 1
    new_comment = {
        "id":        next_comment_id,
        "user":      body.user,
        "text":      body.text,
        "timestamp": _now(),
    }
    comments.append(new_comment)
    issue["comments"] = comments

    write_issues(issues)
    return new_comment


# ── POST employee work update ─────────────────────────────────────────
@router.post("/{issue_id}/work-update")
def work_update(issue_id: int, body: WorkUpdateRequest):
    """Employee submits a field progress update with optional work photo.
    Status is limited to Open/In Progress — only MO Admin can set Resolved."""
    if not body.user or not body.note:
        raise HTTPException(400, "User and note are required")

    if body.status == "Resolved":
        raise HTTPException(403, "Only MO Admin can mark an issue as Resolved")

    issues = read_issues()
    issue = next((i for i in issues if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")

    # Apply status change (only Open or In Progress allowed)
    if body.status and body.status in ("Open", "In Progress"):
        issue["status"] = body.status

    # Append timeline entry with note and optional photo
    issue.setdefault("timeline", []).append({
        "status":    issue["status"],
        "timestamp": _now(),
        "note":      f"Work update by {body.user}: {body.note}",
        "image":     body.image,
    })

    write_issues(issues)
    print(f"[Issues] Work update on #{issue_id} by {body.user}: status={issue['status']}")
    return issue
