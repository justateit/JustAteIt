# JustAteIt API Documentation 🍴

This document provides human-readable documentation for the JustAteIt backend APIs, with special focus on **newly added endpoints, updated schemas, and client integrations**.

---

## Table of Contents
1. [Architecture & Gateway Overview](#architecture--gateway-overview)
2. [New Endpoint: Places Autocomplete (`/api/v1/places/autocomplete`)](#new-endpoint-places-autocomplete-apiv1placesautocomplete)
   - [Overview & Motivation](#overview--motivation)
   - [Upstream Provider & Fair-Use Policy](#upstream-provider--fair-use-policy)
   - [Endpoint Specification](#endpoint-specification)
   - [Request Parameters](#request-parameters)
   - [Response Schema](#response-schema)
   - [Category Filtering & Venue Normalization](#category-filtering--venue-normalization)
   - [Code Examples (curl, JavaScript, Python)](#code-examples)
   - [Error & Fallback Handling](#error--fallback-handling)
3. [New Feature & Schema: Meal Type Classification](#new-feature--schema-meal-type-classification)
   - [Overview & Value Ranges](#overview--value-ranges)
   - [Client-Side Heuristic (`detectMealType`)](#client-side-heuristic-detectmealtype)
   - [Database Schema & Migration](#database-schema--migration)
   - [Updated Review & Draft Endpoints](#updated-review--draft-endpoints)
4. [Frontend Client SDK Reference](#frontend-client-sdk-reference)
5. [Interactive OpenAPI / Swagger Documentation](#interactive-openapi--swagger-documentation)

---

## Architecture & Gateway Overview

The JustAteIt backend uses a FastAPI microservices architecture behind a unified **API Gateway** (`api_gateway` on port `8000`).

```
                ┌──────────────────────────────────────┐
                │          Frontend / Client           │
                │         (Expo / React Native)        │
                └──────────────────┬───────────────────┘
                                   │ HTTP /api/v1/*
                                   ▼
                ┌──────────────────────────────────────┐
                │          API Gateway (:8000)         │
                └──────┬───────────┼────────────┬──────┘
                       │           │            │
       ┌───────────────┘           │            └───────────────┐
       ▼                           ▼                            ▼
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│ user_service │          │ catalog_service  │          │media_service │
│   (:8001)    │          │     (:8002)      │          │   (:8003)    │
│  Profiles,   │          │ Reviews, Drafts, │          │  S3 Uploads  │
│  Users, Recs │          │ Places & Venues  │          │              │
└──────────────┘          └──────────────────┘          └──────────────┘
```

- **Base Gateway URL (Local)**: `http://localhost:8000`
- **Base Gateway URL (Cloud)**: `http://<fargate-ip>:8000` (provisioned via `infra/scripts/run-dev-task.ps1`)
- **Gateway Timeouts**: Configured with a 60-second read timeout (`httpx.Timeout(60.0, connect=10.0)`) to accommodate heavy media uploads and network variations.
- **Microservice Routing**: Requests starting with `/api/v1/places/*` and `/api/v1/reviews/*` are proxied to `catalog_service` (port `8002`).

---

## New Endpoint: Places Autocomplete (`/api/v1/places/autocomplete`)

### Overview & Motivation
The `/api/v1/places/autocomplete` API provides instant, free-text venue suggestions for dining locations, cafes, bakeries, and restaurants. It was introduced to **replace paid Google Places API autocomplete requests** with a zero-cost solution while logging food experiences in the app.

### Upstream Provider & Fair-Use Policy
- **Provider**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- **Cost**: 100% Free / Open Source (no API key required)
- **Nominatim Usage Policy**:
  - **Rate Limit**: Strictly maximum **1 request per second (1 req/s)**.
  - **Debounce Requirement**: Callers (such as mobile or web inputs) **must debounce keystrokes by at least 350 ms** (recommended 400–500 ms) to avoid overwhelming the upstream service or triggering HTTP 429/blocked requests.
  - **User-Agent**: The backend passes an identifiable User-Agent (`JustAteIt-App/1.0 (dev@justateit.app)`) conforming to OpenStreetMap foundation guidelines.

---

### Endpoint Specification

| Property | Value |
| --- | --- |
| **HTTP Method** | `GET` |
| **Gateway Route** | `/api/v1/places/autocomplete` |
| **Downstream Route** | `http://catalog_service:8002/places/autocomplete` |
| **Authentication** | Public (no auth token required) |
| **Caching / Debounce** | Client-side debounce required (≥350 ms) |

---

### Request Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `q` | `string` | **Yes** | — | Search query text typed by user (e.g., `"blue bottle"`, `"chipotle"`, `"tartine"`). |
| `limit` | `integer` | No | `6` | Maximum number of suggestions to return. |

> [!NOTE]
> **Minimum Query Length**: If `q` is shorter than 3 characters (after trimming whitespace), the API immediately returns `{"suggestions": []}` without making an upstream network call.

---

### Response Schema

#### HTTP 200 OK

```json
{
  "suggestions": [
    {
      "name": "Blue Bottle Coffee",
      "address": "Mint Plaza, San Francisco",
      "fullName": "Blue Bottle Coffee, Mint Plaza, Financial District, San Francisco, California, 94103, United States"
    },
    {
      "name": "Blue Bottle Coffee",
      "address": "University Avenue, Palo Alto",
      "fullName": "Blue Bottle Coffee, 456 University Avenue, Downtown, Palo Alto, Santa Clara County, California, 94301, United States"
    }
  ]
}
```

#### Field Descriptions

| Field | Type | Description |
| --- | --- | --- |
| `suggestions` | `Array<VenueSuggestion>` | List of venue matches sorted by relevance. |
| `suggestions[].name` | `string` | Primary venue name (e.g., `"Tartine Bakery"`). |
| `suggestions[].address` | `string` | Human-readable address summary combining road and city/town/locality (e.g., `"Guerrero Street, San Francisco"`). |
| `suggestions[].fullName` | `string` | Complete canonical address string returned from OpenStreetMap. |

---

### Category Filtering & Venue Normalization
To prevent non-food results (e.g., office parks, general stores, highways) from polluting dining suggestions:
1. The backend over-fetches upstream results (`limit * 3`).
2. Filters items against food-relevant OpenStreetMap amenity and shop categories:
   - `restaurant`, `cafe`, `bar`, `pub`, `fast_food`, `food_court`
   - `ice_cream`, `bakery`, `bistro`, `biergarten`
3. Allows general place landmarks (`building`, `place`, `shop`, `tourism`, `leisure`) only if an explicit venue name exists.
4. Parses address components safely, falling back gracefully across `city`, `town`, `village`, `suburb`, and `county`.
5. Truncates the final filtered list to the requested `limit`.

---

### Code Examples

#### cURL
```bash
# Query dining venues with query "tartine"
curl -X GET "http://localhost:8000/api/v1/places/autocomplete?q=tartine&limit=5" \
     -H "Accept: application/json"
```

#### JavaScript / TypeScript (Fetch API)
```typescript
import { searchVenuesAutocomplete } from '@/utils/flavorProfileApi';

// Option A: Using the frontend SDK wrapper
const results = await searchVenuesAutocomplete('tacos', 6);
console.log(results.suggestions);

// Option B: Direct fetch through the gateway
const response = await fetch(
  'http://localhost:8000/api/v1/places/autocomplete?q=blue%20bottle&limit=5'
);
const data = await response.json();
console.log(data.suggestions);
```

#### Python (`httpx` or `requests`)
```python
import httpx

response = httpx.get(
    "http://localhost:8000/api/v1/places/autocomplete",
    params={"q": "boba", "limit": 4},
    timeout=5.0
)
data = response.json()
for venue in data.get("suggestions", []):
    print(f"{venue['name']} - {venue['address']}")
```

---

### Error & Fallback Handling

- **Query too short (`< 3` characters)**: Returns `HTTP 200` with `{"suggestions": []}`.
- **Upstream Nominatim Unavailable / Timeout**: The backend catches network errors and logs a clean warning, returning `{"suggestions": []}` so user input is never blocked.
- **Frontend Fallback**: If the autocomplete dropdown is empty or the user is eating at a venue not listed on OpenStreetMap (or eating a home-cooked meal), the user can enter any custom venue or dish name directly without selecting from the dropdown.

---

## New Feature & Schema: Meal Type Classification

### Overview & Value Ranges
To help users track their dining habits across different times of the day, food entries (`reviews`) and drafts (`drafts`) now support an explicit `meal_type` attribute.

#### Supported Values
```typescript
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
```

| Value | Typical Time Window | Description |
| --- | --- | --- |
| `"Breakfast"` | `05:00 – 10:59` | Morning meals, coffee, pastries, brunch |
| `"Lunch"` | `11:00 – 15:59` | Midday dining |
| `"Dinner"` | `16:00 – 21:59` | Evening meals |
| `"Snack"` | `22:00 – 04:59` | Late night dining, afternoon bites, desserts |

> `meal_type` is optional (`nullable = True` in SQL). Users may freely override the suggested chip in the UI.

---

### Client-Side Heuristic (`detectMealType`)
Located in [`frontend/utils/mealType.ts`](file:///frontend/utils/mealType.ts):

```typescript
import { detectMealType } from '@/utils/mealType';

// Uses local device time automatically (zero network latency)
const suggestedMeal = detectMealType(new Date());
```

**Heuristic Mapping Rules (24-Hour Local Time)**:
- `05:00 <= hour < 11:00` ➔ `'Breakfast'`
- `11:00 <= hour < 16:00` ➔ `'Lunch'`
- `16:00 <= hour < 22:00` ➔ `'Dinner'`
- `22:00 <= hour < 05:00` ➔ `'Snack'`

---

### Database Schema & Migration

Database migration: `backend/supabase/migrations/20261014120000_add_meal_type_to_reviews_and_drafts.sql`

```sql
-- Task#1056: Add meal_type to reviews and drafts --
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS meal_type TEXT;
```

SQLAlchemy models updated:
- `backend/services/catalog_service/db/models.py`:
  - `Review.meal_type = Column(String, nullable=True)`
  - `Draft.meal_type = Column(String, nullable=True)`

---

### Updated Review & Draft Endpoints

The following REST endpoints now accept and return `meal_type`:

#### 1. Create a Review (`POST /api/v1/reviews`)
**Request Body**:
```json
{
  "user_id": "user_2test123456",
  "dish_name": "Avocado Toast",
  "venue_name": "Tartine Bakery",
  "city": "San Francisco",
  "is_restaurant": true,
  "rating": 4.5,
  "sensory_notes": "Crispy sourdough with chili flakes and radish",
  "image_url": "https://justateit-media.s3.amazonaws.com/uploads/photo.jpg",
  "meal_type": "Breakfast"
}
```
**Response**: `HTTP 200 OK`
```json
{
  "message": "Review created successfully",
  "review_id": "8a3e792b-3bf1-47c1-92ab-62e92c68fbd1",
  "points_earned": 5
}
```

#### 2. Get User Reviews (`GET /api/v1/reviews/{user_id}`)
**Response**: `HTTP 200 OK`
```json
{
  "reviews": [
    {
      "id": "8a3e792b-3bf1-47c1-92ab-62e92c68fbd1",
      "dish_name": "Avocado Toast",
      "venue_name": "Tartine Bakery",
      "rating": 4.5,
      "sensory_notes": "Crispy sourdough with chili flakes and radish",
      "image_url": "https://justateit-media.s3.amazonaws.com/uploads/photo.jpg",
      "meal_type": "Breakfast",
      "created_at": "2026-10-14T08:30:00"
    }
  ],
  "count": 1
}
```

#### 3. Update a Review (`PUT /api/v1/reviews/{review_id}`)
**Request Body**:
```json
{
  "meal_type": "Brunch",
  "rating": 5.0
}
```
**Response**: `HTTP 200 OK` with updated review status.

#### 4. Create a Draft (`POST /api/v1/drafts`)
**Request Body**:
```json
{
  "user_id": "user_2test123456",
  "dish_name": "Tonkotsu Ramen",
  "venue_name": "Ippudo",
  "rating": 4.0,
  "meal_type": "Dinner"
}
```
**Response**: `HTTP 200 OK` with draft details and id.

#### 5. Get User Drafts (`GET /api/v1/drafts/{user_id}`)
Each draft object in the returned array includes `"meal_type": "Dinner" | null`.

#### 6. Update a Draft (`PUT /api/v1/drafts/{draft_id}`)
Accepts `meal_type` in the payload and updates `drafts.meal_type`.

#### 7. Publish a Draft (`POST /api/v1/drafts/{draft_id}/publish`)
Converts a draft into an official review, automatically copying `draft.meal_type` onto the created `Review` record and triggering flavor profile recalculation.

---

## Frontend Client SDK Reference

The frontend interacts with these APIs via helper functions in [`frontend/utils/flavorProfileApi.js`](file:///frontend/utils/flavorProfileApi.js):

### `searchVenuesAutocomplete(query, limit = 6)`
```javascript
import { searchVenuesAutocomplete } from '@/utils/flavorProfileApi';

const data = await searchVenuesAutocomplete('Blue Bottle', 5);
// data.suggestions: [{ name, address, fullName }, ...]
```

### `submitLog(userId, logData)`
```javascript
import { submitLog } from '@/utils/flavorProfileApi';

await submitLog('user_123', {
  dish: 'Margherita Pizza',
  venue: "Tony's Pizza",
  city: 'San Francisco',
  is_restaurant: true,
  sensory_notes: 'Wood-fired crust, fresh basil',
  rating: 4.8,
  image_url: 'https://...',
  meal_type: 'Dinner',
});
```

### `saveDraft(userId, draftData)` / `updateDraft(draftId, draftData)`
```javascript
import { saveDraft, updateDraft } from '@/utils/flavorProfileApi';

const draft = await saveDraft('user_123', {
  dish_name: 'Croissant',
  meal_type: 'Breakfast',
  rating: 4.0,
});

await updateDraft(draft.draft.id, {
  meal_type: 'Snack',
});
```

---

## Interactive OpenAPI / Swagger Documentation

When running services locally or in dev, FastAPI automatically generates interactive documentation interfaces:

- **API Gateway Docs**: `http://localhost:8000/docs`
- **Catalog Service Docs**: `http://localhost:8002/docs`
- **User Service Docs**: `http://localhost:8001/docs`
- **Media Service Docs**: `http://localhost:8003/docs`
- **ReDoc Alternative UI**: Append `/redoc` instead of `/docs` to any service URL.

These interfaces allow you to test queries, inspect JSON schemas, and view real response models interactively.

