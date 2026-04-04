/**
 * flavorProfileApi.js
 * Thin wrapper around the flavor-profile FastAPI endpoints.
 *
 * Base URL is read from EXPO_PUBLIC_FLAVOR_API_URL in .env.
 * Falls back to localhost:8001 for local development on a simulator.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_FLAVOR_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8001';

/**
 * Fetch the current flavor profile for a user.
 * @param {string} userId  - Clerk user ID or any stable user identifier
 * @returns {Promise<{ profile: Object, review_count: number, personality: string }>}
 */
export async function getFlavorProfile(userId) {
  const res = await fetch(`${BASE_URL}/flavor-profile/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`getFlavorProfile failed: ${res.status}`);
  return res.json();
}

/**
 * Submit a dish rating and get the recalculated flavor profile back.
 * @param {string} userId
 * @param {string} dishId   - Must match a key in MOCK_DISHES (e.g. "dish_001")
 * @param {number} rating   - Star rating 1–5
 * @returns {Promise<{ profile: Object, review_count: number, personality: string }>}
 */
export async function submitRating(userId, dishId, rating) {
  const res = await fetch(`${BASE_URL}/flavor-profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, dish_id: dishId, rating }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `submitRating failed: ${res.status}`);
  }
  return res.json();
}
