/**
 * Level curve for the points system.
 *
 * Kept here rather than inline because two screens render a Level card — the
 * Insights tab and the profile page — and when the thresholds were duplicated in
 * both, changing one silently left the other disagreeing about the user's level.
 *
 * The curve escalates instead of being a flat 100 per level. There are only five
 * named levels, and the 20 milestones award 1410 points between them (plus 10 per
 * log), so a flat curve pushed users to the top rank within their first few
 * entries — the rank stopped meaning anything. These thresholds are sized so that
 * "Culinary Connoisseur" needs sustained logging and most of the milestones.
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
    // null at max level, so callers show "max level" rather than promising a
    // next rank that does not exist — the old code advertised the level the
    // user was already on.
    nextLabel: atMax ? null : getLevelLabel(level + 1),
    atMax,
    pointsIntoLevel,
    pointsForLevel,
    pointsToNext,
    progress: atMax ? 1 : pointsIntoLevel / pointsForLevel,
  };
}
