from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .nlp_engine import simplify_text
from .models import UserProfile   # make sure you created this model

# --- Simplification API ---
@csrf_exempt
def simplify_api(request):
    if request.method == "POST":
        body = json.loads(request.body)
        text = body.get("text", "")
        level = body.get("level", "easy")

        simplified = simplify_text(text, level)
        return JsonResponse({"simplified": simplified})

    return JsonResponse({"error": "Invalid request"})


# --- Behavior Logging API ---
@csrf_exempt
def log_behavior(request):
    if request.method == "POST":
        data = json.loads(request.body)
        reading_time = data.get("readingTime", 0)
        simplify_clicks = data.get("simplifyClicks", 0)
        speed_changes = data.get("speedChanges", 0)

        # For demo, assume single user "demo"
        user_id = "demo"
        profile, _ = UserProfile.objects.get_or_create(user_id=user_id)

        # Update averages
        profile.avg_reading_time = (profile.avg_reading_time + reading_time) / 2
        profile.total_simplify_clicks += simplify_clicks
        profile.speed_changes += speed_changes

        # Decide difficulty
        # --- SMART ADAPTIVE LOGIC ---

        score = 0

# 🔹 Reading time impact
        if reading_time > 8:
            score += 2
        elif reading_time > 5:
            score += 1
        else:
            score -= 0

# 🔹 Simplify clicks (struggling indicator)
        if simplify_clicks >= 3:
            score += 2
        elif simplify_clicks == 1 or simplify_clicks == 2:
            score += 1

# 🔹 Speed changes (confusion indicator)
        if speed_changes >= 6:
            score += 2
        elif speed_changes >= 3:
            score += 1

# 🔹 Final decision
        if score >= 4:
            profile.preferred_level = "easy"    
        elif score <= 1:
            profile.preferred_level = "hard"
        else:
            profile.preferred_level = "medium"

        profile.save()
        return JsonResponse({"status": "ok", "level": profile.preferred_level})

    return JsonResponse({"error": "Invalid request"})


# --- Difficulty Retrieval API ---


def get_difficulty(request):
    # TEMP FIX (no login system yet)
    return JsonResponse({
        "level": "medium"
    })
