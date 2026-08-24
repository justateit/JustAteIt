import profile
import anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# mock data
profile = {
    "spice": 0.35,
    "acid": 0.2,
    "umami": 0.8,
    "sweet": 0.1,
    "texture": 0.5,
    "review_count": 24,
}

cities = ["New York", "Phoenix", "Tokyo"]
saves = 47
top_cuisines = ["Mexican (8)", "Japanese (6)", "French (4)", "Chinese (3)"]
avg_rating = 4.4
five_star_pct = 42
four_half_pct = 28
four_star_pct = 0
three_half_pct = 20
three_star_pct = 10
critic_label = "Tough Critic"
poorly_rated_cuisines = ["Italian"]

prompt = f"""
Role: You are a culinary recommender with deep knowledge of restaurants, dishes, and flavor profiles. You know what restaurants are known for and can match dishes to personal taste preferences.

Context: You will receive an anonymous user's complete behavioral profile including flavor scores, cuisine history, rating patterns, and dining activity.

User Profile:
- Flavor scores (0 to 1, higher means stronger preference):
    Spice: {profile['spice']}
    Acid: {profile['acid']}
    Umami: {profile['umami']}
    Sweet: {profile['sweet']}
    Texture: {profile['texture']}

- Dining activity:
    Total logs: {profile['review_count']}
    Cities visited: {cities}
    Saves received: {saves}
    
- Top cuisines logged: {top_cuisines}

- Rating breakdown:
    Average rating: {avg_rating}
    5 stars: {five_star_pct}%
    4.5 stars: {four_half_pct}%
    4 stars: {four_star_pct}%
    3.5 stars: {three_half_pct}%
    3 stars: {three_star_pct}%

    Critic Personality: {critic_label}
    
- Cuisines rated poorly (3 stars or below): {poorly_rated_cuisines}
    
Task:
1. Recommend exactly 3 dishes that best match this profile
2. Prioritize novelty - suggest dishes that the user may not have tried
3. If any cuisines were rated poorly, include at least one recommendation from that cuisine but from a notably different and highly regarded restaurant - give them a chance to rediscover it
4. Factor in their critic personality - if they are a tough critic, recommend only exceptional well regarded dishes, not causal spots
5. If they have visited multiple cities, vary recommendations across different locations when possible

Constraints:
- Do not reference any personal information beyond what is provided
- Return only valid JSON with no markdown or backticks

Output format:
{{
  "insight": "one warm conversational sentence about their overall taste pattern and dining personality",
  "critic_label": "Tough Critic or Generous Rater or Balanced Reviewer",
  "recommendations": [
    {{
      "dish": "dish name",
      "restaurant": "restaurant name",
      "city": "city",
      "match": 95,
      "cuisine": "cuisine type",
      "reason": "short phrase explaining why this matches their profile"
    }}
  ]
}}
"""


message = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=2000,
    messages=[
        {
            "role": "user",
            "content": prompt        
        }
    ]

)

raw = message.content[0].text
print("RAW RESPONSE:", raw)
"""print("STOP REASON:", message.stop_reason)"""
"""
if raw:
    result = json.loads(raw)
    print(json.dumps(result, indent=2))
else:
    print("Empty response from Claude")
"""

clean = raw.strip()
if clean.startswith("```"):
    clean = clean.split("```")[1]
    if clean.startswith("json"):
        clean = clean[4:]
    clean = clean.strip()
result = json.loads(clean)
print(json.dumps(result, indent=2))