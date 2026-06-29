"""
routers/ai.py — Gemini Vision image categorization.
Uses google-generativeai SDK when GEMINI_API_KEY is set,
falls back to simulation otherwise.
"""
import os
import base64
import re
import json

from fastapi import APIRouter, HTTPException
from backend.models import CategorizeRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])



_GEMINI_PROMPT = """You are a civic infrastructure issue analyzer for Indian cities.
Analyze this image carefully.

If the image clearly shows a civic infrastructure problem, respond with ONLY this JSON (no markdown, no explanation):
{
  "category": one of [
    "Potholes", "Road damage", "Missing road signs", "Road obstruction",
    "Light not working", "Pole damaged", "Exposed wiring",
    "Water leakage", "No water supply", "Low pressure", "Contaminated water",
    "Drain blockage", "Sewer overflow", "Open manhole",
    "Garbage not collected", "Overflowing bin", "Illegal dumping",
    "Fallen tree", "Tree pruning", "Park maintenance",
    "Signal malfunction", "Illegal parking", "Missing signage",
    "Stray dogs", "Dead animal", "Cattle on road",
    "Air pollution", "Noise pollution", "Water pollution",
    "Bus stop damage", "Footpath damage", "Public toilet issue", "Government building maintenance"
  ],
  "title": concise 5-8 word issue title,
  "description": 2-3 sentence description of the problem and its impact on citizens,
  "severity": one of ["Low", "Medium", "High", "Critical"],
  "confidence": number between 0.75 and 0.99,
  "tags": array of exactly 3 short relevant tags,
  "unclear": false
}

If the image shows ANY of the following, respond with ONLY { "unclear": true }:
- A person or face (regardless of context)
- An animal (unless it's a stray dog, dead animal, or cattle causing a road hazard)
- Food or drink
- Indoor scenes with no infrastructure issues
- Nature, landscapes, sky without any civic problem
- Screenshots, documents, text
- Anything that is NOT a clearly visible civic infrastructure problem outdoors"""



@router.post("/categorize")
async def categorize(body: CategorizeRequest):
    if not body.image:
        raise HTTPException(400, "Image data is required")

    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)

            # Decode base64 image
            match = re.match(r"data:(image/\w+);base64,(.+)", body.image, re.DOTALL)
            if match:
                mime_type  = match.group(1)
                img_bytes  = base64.b64decode(match.group(2))
            else:
                img_bytes  = base64.b64decode(body.image)
                mime_type  = "image/jpeg"

            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content([
                {"mime_type": mime_type, "data": img_bytes},
                _GEMINI_PROMPT,
            ])

            raw = response.text.strip()
            # Strip accidental markdown fences
            cleaned = re.sub(r"```json|```", "", raw, flags=re.IGNORECASE).strip()
            parsed = json.loads(cleaned)

            print(f"[AI] Gemini → category: {parsed.get('category', 'unclear')}, "
                  f"confidence: {parsed.get('confidence', 'n/a')}")

            if parsed.get("unclear") is True:
                return {"success": True, "unclear": True}

            return {"success": True, "unclear": False, **parsed}

        except Exception as e:
            print(f"[AI] Gemini call failed: {e}")
            return {"success": True, "unclear": True}

    # ── No API key configured ─────────────────────────────────────────────────
    print("[AI] No GEMINI_API_KEY set — cannot analyze image")
    return {"success": True, "unclear": True}
