/**
 * Level curve for the points system.
 */

// Cumulative total points required to REACH each level. Index 0 is level 1.
export const LEVEL_THRESHOLDS = [0, 250, 600, 1100, 1800];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getLevelLabel(level) {
  if (level >= 5) return 'Culinary Connoisseur';
  if (level === 4) return 'Taste Architect';
  if (level === 3) return 'Palate Pioneer';
  if (level === 2) return 'Flavor Seeker';
  if (level === 1) return 'Fresh Bite';
  return 'Earn more points!';
}

/**
 * Everything a Level card needs, derived from a single points total.
 *
 * @param {number} totalPoints - points_count from the flavor profile
 * @returns {{
 *   level: number, label: string, nextLabel: string|null, atMax: boolean,
 *   pointsIntoLevel: number, pointsForLevel: number, pointsToNext: number,
 *   progress: number
 * }}
 */
export function getLevelProgress(totalPoints) {
  const points = Math.max(0, Number(totalPoints) || 0);

  // Highest threshold the user has passed.
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }

  const atMax = level >= MAX_LEVEL;
  const floor = LEVEL_THRESHOLDS[level - 1];
  const ceiling = atMax ? null : LEVEL_THRESHOLDS[level];

  const pointsIntoLevel = points - floor;
  const pointsForLevel = atMax ? 0 : ceiling - floor;
  const pointsToNext = atMax ? 0 : ceiling - points;

  return {
    level,
    label: getLevelLabel(level),
    nextLabel: atMax ? null : getLevelLabel(level + 1),
    atMax,
    pointsIntoLevel,
    pointsForLevel,
    pointsToNext,
    progress: atMax ? 1 : pointsIntoLevel / pointsForLevel,
  };
}
