/**
 * flavorProfileApi.js
 * Thin wrapper around all JustAteIt backend endpoints (port 8001).
 *
 * Base URL is read from EXPO_PUBLIC_FLAVOR_API_URL in .env.
 * Falls back to localhost:8001 for local development on a simulator.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Flavor Profile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current flavor profile for a user.
 * @param {string} userId  - Clerk user ID
 */
export async function getFlavorProfile(userId) {
  const res = await fetch(`${BASE_URL}/api/v1/flavor-profiles/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`getFlavorProfile failed: ${res.status}`);
  return res.json();
}

/**
 * Submit a dish rating and get the recalculated flavor profile back.
 * @param {string} userId
 * @param {string} dishId   - Must match a key in MOCK_DISHES (e.g. "dish_001")
 * @param {number} rating   - Star rating 1–5
 */
export async function submitRating(userId, dishId, rating) {
  const res = await fetch(`${BASE_URL}/api/v1/flavor-profiles/update`, {
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

// ─────────────────────────────────────────────────────────────────────────────
// Food Logs / Journal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a new food journal entry for the current user.
 * @param {string} userId
 * @param {{ dish, venue, city, is_restaurant, sensory_notes, rating, image_url }} logData
 */
export async function submitLog(userId, logData) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...logData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `submitLog failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch all journal entries for a user (newest first).
 * @param {string} userId
 * @returns {Promise<{ logs: Array, count: number }>}
 */
export async function getLogs(userId) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`getLogs failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or update the user's profile row in Supabase.
 * Call this once after sign-in so the users table row exists.
 * @param {string} userId
 * @param {{ username?, bio?, avatar_url? }} userData
 */
export async function upsertUser(userId, userData = {}) {
  const res = await fetch(`${BASE_URL}/api/v1/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, ...userData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `upsertUser failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a user's profile data.
 * @param {string} userId
 */
export async function getUser(userId) {
  const res = await fetch(`${BASE_URL}/api/v1/users/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`getUser failed: ${res.status}`);
  return res.json();
}
