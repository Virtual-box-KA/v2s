"""
routers/stats.py — Dashboard statistics and citizen leaderboard.
"""
from typing import Optional
from fastapi import APIRouter
from backend.db import read_issues, read_users

router = APIRouter(prefix="/api", tags=["stats"])

from fastapi import HTTPException
from backend.db import write_users
from backend.models import XPSyncRequest

SUBCATEGORY_TO_PARENT = {
    "Potholes": "Roads", "Road damage": "Roads", "Missing road signs": "Roads",
    "Road obstruction": "Roads", "Pothole": "Roads",
    "Light not working": "Street Lighting", "Pole damaged": "Street Lighting",
    "Exposed wiring": "Street Lighting", "Damaged Streetlight": "Street Lighting",
    "Water leakage": "Water", "No water supply": "Water", "Low pressure": "Water",
    "Contaminated water": "Water", "Water Leakage": "Water",
    "Drain blockage": "Sewerage", "Sewer overflow": "Sewerage", "Open manhole": "Sewerage",
    "Garbage not collected": "Waste Management", "Overflowing bin": "Waste Management",
    "Illegal dumping": "Waste Management", "Waste Management": "Waste Management",
    "Fallen tree": "Parks & Greenery", "Tree pruning": "Parks & Greenery",
    "Park maintenance": "Parks & Greenery",
    "Signal malfunction": "Traffic", "Illegal parking": "Traffic", "Missing signage": "Traffic",
    "Stray dogs": "Animal Control", "Dead animal": "Animal Control", "Cattle on road": "Animal Control",
    "Air pollution": "Environment", "Noise pollution": "Environment", "Water pollution": "Environment",
    "Bus stop damage": "Public Infrastructure", "Footpath damage": "Public Infrastructure",
    "Public toilet issue": "Public Infrastructure",
    "Government building maintenance": "Public Infrastructure",
    "Public Infrastructure": "Public Infrastructure",
}

CATEGORIES = [
    "Roads", "Street Lighting", "Water", "Sewerage", "Waste Management",
    "Parks & Greenery", "Traffic", "Animal Control", "Environment", "Public Infrastructure"
]


def _build_insights_from_issues(issues: list) -> list:
    """Generate predictive insight cards from real issue data."""
    if not issues:
        return []

    # Count by parent category
    cat_counts: dict = {c: 0 for c in CATEGORIES}
    for issue in issues:
        parent = SUBCATEGORY_TO_PARENT.get(issue.get("category", ""), "")
        if parent in cat_counts:
            cat_counts[parent] += 1

    # Sort categories by issue count descending
    top_cats = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)

    # Templates per category
    TEMPLATES = {
        "Roads": {
            "title": "Road Deterioration Risk",
            "description": lambda n: f"{n} road-related issues detected. Monsoon patterns historically amplify pothole surges by 70% on primary highway segments.",
            "recommendation": "Pre-apply gravel overlays on vulnerable corridors and prioritise hot-mix asphalt batches.",
            "severity": "High",
            "confidence": "91%",
        },
        "Water": {
            "title": "Aging Pipeline Risk",
            "description": lambda n: f"{n} water-related complaints logged. Pressure fluctuations suggest joint stress in aging secondary distribution pipes.",
            "recommendation": "Install dynamic pressure relief valves and conduct joint inspections within 72 hours.",
            "severity": "High",
            "confidence": "87%",
        },
        "Sewerage": {
            "title": "Drain & Sewerage Overflow Risk",
            "description": lambda n: f"{n} sewerage issues reported. Seasonal rainfall increases drain blockage probability by 60%.",
            "recommendation": "Deploy drain-clearing crews and inspect manhole covers for overflow risk before monsoon peak.",
            "severity": "High",
            "confidence": "83%",
        },
        "Waste Management": {
            "title": "Waste Collection Bottleneck",
            "description": lambda n: f"{n} waste management complaints. Weekend pedestrian congestion causes 2.5× garbage pile-ups at central hubs.",
            "recommendation": "Reschedule waste sweep routes to Sunday evening runs to prevent overflow bins.",
            "severity": "Medium",
            "confidence": "89%",
        },
        "Street Lighting": {
            "title": "Street Lighting Outage Cluster",
            "description": lambda n: f"{n} streetlight failures reported in this area. Outages correlate with increased road accident risk at night.",
            "recommendation": "Dispatch electrical crew for bulk lamp replacement and pole inspection.",
            "severity": "Medium",
            "confidence": "78%",
        },
        "Traffic": {
            "title": "Traffic Signal Disruption Risk",
            "description": lambda n: f"{n} traffic-related issues filed. Signal malfunctions during peak hours increase accident likelihood by 45%.",
            "recommendation": "Conduct night-hour signal calibration and deploy traffic wardens at high-risk intersections.",
            "severity": "Medium",
            "confidence": "82%",
        },
        "Animal Control": {
            "title": "Stray Animal Density Alert",
            "description": lambda n: f"{n} animal control reports in this zone. High stray dog density correlates with citizen safety incidents.",
            "recommendation": "Coordinate with municipal animal welfare for cage-van deployment in reported sectors.",
            "severity": "Medium",
            "confidence": "75%",
        },
        "Parks & Greenery": {
            "title": "Green Zone Maintenance Overdue",
            "description": lambda n: f"{n} park & greenery issues pending. Delayed pruning increases monsoon fallen-tree hazards by 50%.",
            "recommendation": "Schedule pre-monsoon tree pruning and park maintenance blitz in reported areas.",
            "severity": "Low",
            "confidence": "72%",
        },
        "Environment": {
            "title": "Environmental Pollution Alert",
            "description": lambda n: f"{n} environmental complaints received. Continued inaction risks compliance violations.",
            "recommendation": "Initiate pollution source investigation and coordinate with the PCB for corrective notices.",
            "severity": "Medium",
            "confidence": "80%",
        },
        "Public Infrastructure": {
            "title": "Infrastructure Damage Cluster",
            "description": lambda n: f"{n} public infrastructure reports detected. Delayed repairs compound structural degradation costs.",
            "recommendation": "Dispatch civil engineering crew for damage assessment and priority repair scheduling.",
            "severity": "Low",
            "confidence": "70%",
        },
    }

    insights = []
    for cat, count in top_cats:
        if count == 0:
            continue
        tmpl = TEMPLATES.get(cat)
        if not tmpl:
            continue
        insights.append({
            "title": tmpl["title"],
            "description": tmpl["description"](count),
            "recommendation": tmpl["recommendation"],
            "severity": tmpl["severity"],
            "confidence": tmpl["confidence"],
        })
        if len(insights) >= 3:
            break

    return insights


def _build_resolution_times(issues: list) -> dict:
    """Calculate average resolution times per category from real data (in hours).
    Falls back to heuristic defaults for categories with no resolved issues."""
    DEFAULTS = {
        "Roads": 36, "Street Lighting": 48, "Water": 18, "Sewerage": 24,
        "Waste Management": 12, "Parks & Greenery": 30, "Traffic": 24,
        "Animal Control": 16, "Environment": 48, "Public Infrastructure": 72
    }
    from datetime import datetime

    totals: dict = {c: [] for c in CATEGORIES}
    for issue in issues:
        if issue.get("status") != "Resolved":
            continue
        parent = SUBCATEGORY_TO_PARENT.get(issue.get("category", ""), "")
        if parent not in totals:
            continue
        timeline = issue.get("timeline", [])
        resolved_node = next((t for t in reversed(timeline) if t.get("status") == "Resolved"), None)
        if not resolved_node:
            continue
        try:
            created = datetime.fromisoformat(issue["createdAt"].replace("Z", "+00:00"))
            resolved = datetime.fromisoformat(resolved_node["timestamp"].replace("Z", "+00:00"))
            hours = max(1, int((resolved - created).total_seconds() / 3600))
            totals[parent].append(hours)
        except Exception:
            pass

    result = {}
    for cat in CATEGORIES:
        if totals[cat]:
            result[cat] = round(sum(totals[cat]) / len(totals[cat]))
        else:
            result[cat] = DEFAULTS[cat]
    return result


# ── GET /api/stats ────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(username: Optional[str] = None, city: Optional[str] = None):
    issues = read_issues()

    # Filter by city param first (used by InsightsView city selector)
    if city and city not in ("null", "undefined", ""):
        issues = [i for i in issues if i.get("city", "").lower() == city.lower()]
    # Then filter by MO admin username scope
    elif username and username not in ("null", "undefined", "") and username.startswith("mo-"):
        city_name = username[3:].replace("-", " ").title()
        issues = [i for i in issues if i.get("city", "").lower() == city_name.lower()]

    total = len(issues)
    resolved = sum(1 for i in issues if i.get("status") == "Resolved")
    critical = sum(1 for i in issues if i.get("severity") == "Critical" and i.get("status") != "Resolved")
    community_votes = sum(i.get("upvotes", 0) for i in issues)
    resolution_rate = round((resolved / total) * 100) if total else 0

    category_breakdown = {c: 0 for c in CATEGORIES}
    for issue in issues:
        cat = issue.get("category", "")
        parent_cat = SUBCATEGORY_TO_PARENT.get(cat, cat)
        if parent_cat in category_breakdown:
            category_breakdown[parent_cat] += 1

    return {
        "metrics": {
            "total": total,
            "resolved": resolved,
            "resolutionRate": resolution_rate,
            "critical": critical,
            "communityVotes": community_votes,
        },
        "categoryBreakdown": category_breakdown,
        "resolutionTimes": _build_resolution_times(issues),
        "predictiveInsights": _build_insights_from_issues(issues),
    }


# ── GET /api/leaderboard ──────────────────────────────────────────────────────
@router.get("/leaderboard")
def get_leaderboard():
    users = read_users()
    citizens = [u for u in users if u.get("role") == "citizen"]
    leaderboard = sorted(
        [{"name": u["username"], "score": u.get("xp", 0), "reports": 0,
          "verifications": 0, "badge": u.get("badge", "")} for u in citizens],
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
    if user.get("role") in ("admin", "employee"):
        return user

    user["xp"] = user.get("xp", 0) + body.xpGained
    user["points"] = user.get("points", 0) + body.xpGained

    xp = user["xp"]
    if xp >= 500:   user["badge"] = "Civic Champion"
    elif xp >= 300: user["badge"] = "Pothole Sentinel"
    elif xp >= 150: user["badge"] = "Eco-Warrior"
    elif xp >= 100: user["badge"] = "Citizen Patrol"

    write_users(users)
    return user
