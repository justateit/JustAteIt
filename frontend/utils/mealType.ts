/**
 * mealType.ts
 * Pure utility for inferring meal type from local device time.
 *
 * Ranges (hour of day, 24-h):
 *   05:00 – 10:59  → Breakfast
 *   11:00 – 15:59  → Lunch
 *   16:00 – 21:59  → Dinner
 *   22:00 – 04:59  → Snack / Late Night
 */

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

/**
 * Derives the most likely meal type from a Date object (defaults to now).
 * Uses the device's local clock — no network required.
 */
export function detectMealType(date: Date = new Date()): MealType {
  const hour = date.getHours(); // 0–23 in local time

  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snack'; // 22:00 – 04:59
}
