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
 * Permanently delete a user account and all associated profile, review, and media data.
 * @param {string} userId - Clerk user ID
 */
export async function deleteUserAccount(userId) {
  const res = await fetch(`${BASE_URL}/api/v1/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `deleteUserAccount failed: ${res.status}`);
  }
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

/**
 * Update a journal entry by ID.
 * @param {string} reviewId
 * @param {{ dish_name?, venue_name?, city?, rating?, sensory_notes?, image_url? }} updateData
 */
export async function updateLog(reviewId, updateData) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `updateLog failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Permanently delete a journal entry by ID.
 * @param {string} reviewId
 */
export async function deleteLog(reviewId) {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `deleteLog failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a nearby restaurant from Google Places based on lat/lng.
 * @param {number} lat
 * @param {number} lng
 */
export async function getNearbyVenue(lat, lng) {
  const res = await fetch(`${BASE_URL}/api/v1/venues/nearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) throw new Error(`getNearbyVenue failed: ${res.status}`);
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

/**
 * Upload a local avatar image to S3 via media_service.
 * @param {string} imageUri - Local file URI or web blob URI
 * @returns {Promise<string>} Public S3 URL of the uploaded image
 */
export async function uploadAvatarImage(imageUri) {
  if (!imageUri || imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return imageUri;
  }

  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  if (typeof window !== 'undefined' && window.fetch && Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('file', new File([blob], filename, { type }));
  } else {
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    });
  }

  const response = await fetch(`${BASE_URL}/api/v1/media/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Avatar upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.url;
}
