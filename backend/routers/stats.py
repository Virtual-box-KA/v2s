"""
routers/stats.py — Dashboard statistics and citizen leaderboard.
"""
from typing import Optional
from fastapi import APIRouter
from backend.db import read_issues, read_users

router = APIRouter(prefix="/api", tags=["stats"])

# XP sync also lives in the users namespace — included here to keep routes tidy
from fastapi import HTTPException
from backend.db import write_users
from backend.models import XPSyncRequest


# ── GET /api/stats ────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(username: Optional[str] = None):
    issues = read_issues()
    # City-scoped filtering for Municipal Office accounts
    if username and username not in ("null", "undefined", "") and username.startswith("mo-"):
        city_name = username[3:].replace("-", " ").title()
        issues = [i for i in issues if i.get("city", "").lower() == city_name.lower()]

    total          = len(issues)
    resolved       = sum(1 for i in issues if i.get("status") == "Resolved")
    critical       = sum(1 for i in issues if i.get("severity") == "Critical" and i.get("status") != "Resolved")
    community_votes = sum(i.get("upvotes", 0) for i in issues)
    resolution_rate = round((resolved / total) * 100) if total else 0

    category_breakdown = {
        "Roads": 0,
        "Street Lighting": 0,
        "Water": 0,
        "Sewerage": 0,
        "Waste Management": 0,
        "Parks & Greenery": 0,
        "Traffic": 0,
        "Animal Control": 0,
        "Environment": 0,
        "Public Infrastructure": 0
    }

    SUBCATEGORY_TO_PARENT = {
        "Potholes": "Roads", "Road damage": "Roads", "Missing road signs": "Roads", "Road obstruction": "Roads",
        "Pothole": "Roads",
        "Light not working": "Street Lighting", "Pole damaged": "Street Lighting", "Exposed wiring": "Street Lighting",
        "Damaged Streetlight": "Street Lighting",
        "Water leakage": "Water", "No water supply": "Water", "Low pressure": "Water", "Contaminated water": "Water",
        "Water Leakage": "Water",
        "Drain blockage": "Sewerage", "Sewer overflow": "Sewerage", "Open manhole": "Sewerage",
        "Garbage not collected": "Waste Management", "Overflowing bin": "Waste Management", "Illegal dumping": "Waste Management",
        "Waste Management": "Waste Management",
        "Fallen tree": "Parks & Greenery", "Tree pruning": "Parks & Greenery", "Park maintenance": "Parks & Greenery",
        "Signal malfunction": "Traffic", "Illegal parking": "Traffic", "Missing signage": "Traffic",
        "Stray dogs": "Animal Control", "Dead animal": "Animal Control", "Cattle on road": "Animal Control",
        "Air pollution": "Environment", "Noise pollution": "Environment", "Water pollution": "Environment",
        "Bus stop damage": "Public Infrastructure", "Footpath damage": "Public Infrastructure", "Public toilet issue": "Public Infrastructure", "Government building maintenance": "Public Infrastructure",
        "Public Infrastructure": "Public Infrastructure"
    }

    for issue in issues:
        cat = issue.get("category", "")
        parent_cat = SUBCATEGORY_TO_PARENT.get(cat, cat)
        if parent_cat in category_breakdown:
            category_breakdown[parent_cat] += 1

    return {
        "metrics": {
            "total":           total,
            "resolved":        resolved,
            "resolutionRate":  resolution_rate,
            "critical":        critical,
            "communityVotes":  community_votes,
        },
        "categoryBreakdown": category_breakdown,
        "resolutionTimes": {
            "Roads": 36,
            "Street Lighting": 48,
            "Water": 18,
            "Sewerage": 24,
            "Waste Management": 12,
            "Parks & Greenery": 30,
            "Traffic": 24,
            "Animal Control": 16,
            "Environment": 48,
            "Public Infrastructure": 72
        },
        "predictiveInsights": [
            {
                "title":          "Monsoon Pothole Surge",
                "description":    "Based on historical indices, monsoon patterns trigger pothole surges by 78% on primary highway segments.",
                "confidence":     "92%",
                "recommendation": "Pre-apply gravel overlays on vulnerable corridors and secure hot-mix asphalt batches.",
                "severity":       "High",
            },
            {
                "title":          "Aging Pipeline Risk",
                "description":    "Pressure fluctuations show high joint vibration signatures in aging secondary distributions, predicting a 65% rupture risk.",
                "confidence":     "87%",
                "recommendation": "Install dynamic pressure relief valves and conduct joint inspections.",
                "severity":       "Medium",
            },
            {
                "title":          "Waste Collection Bottleneck",
                "description":    "Weekend pedestrian congestion causes 2.5x garbage pile-ups at central hubs, overloading local dumpster capacities.",
                "confidence":     "89%",
                "recommendation": "Reschedule waste sweep routes to Sunday evening runs to prevent overflow bins.",
                "severity":       "Medium",
            },
        ],
    }


# ── GET /api/leaderboard ──────────────────────────────────────────────────────
@router.get("/leaderboard")
def get_leaderboard():
    users = read_users()
    citizens = [u for u in users if u.get("role") != "admin"]
    leaderboard = sorted(
        [{"name": u["username"], "score": u.get("xp", 0), "reports": 0, "verifications": 0, "badge": u.get("badge", "")}
         for u in citizens],
        key=lambda x: x["score"],
        reverse=True,
    )
    return leaderboard


# ── POST /api/users/{username}/xp ────────────────────────────────────────────
@router.post("/users/{username}/xp")
def sync_xp(username: str, body: XPSyncRequest):
    users = read_users()
    user = next((u for u in users if u.get("username", "").lower() == username.lower()), None)
    if not user:
        raise HTTPException(404, "User not found")

    if user.get("role") == "admin":
        return user

    user["xp"]     = user.get("xp", 0)     + body.xpGained
    user["points"] = user.get("points", 0) + body.xpGained

    xp = user["xp"]
    if   xp >= 500: user["badge"] = "Civic Champion"
    elif xp >= 300: user["badge"] = "Pothole Sentinel"
    elif xp >= 150: user["badge"] = "Eco-Warrior"
    elif xp >= 100: user["badge"] = "Citizen Patrol"

    write_users(users)
    return user
