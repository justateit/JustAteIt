/**
 * flavorProfiles.ts
 *
 * Lightweight, functional v1 Flavor Profile tagging system for JustAteIt.
 * Provides curated flavor suggestions based on cuisine and dish name keywords,
 * and handles multi-select chip toggling (up to 3 flavor chips).
 */

export type FlavorTag =
  | 'Spicy'
  | 'Umami'
  | 'Sweet'
  | 'Tangy'
  | 'Rich'
  | 'Fresh'
  | 'Smoky'
  | 'Salty'
  | 'Crispy'
  | 'Herbal'
  | 'Zesty'
  | 'Earthy';

export const ALL_FLAVOR_TAGS: FlavorTag[] = [
  'Spicy',
  'Umami',
  'Sweet',
  'Tangy',
  'Rich',
  'Fresh',
  'Smoky',
  'Salty',
  'Crispy',
  'Herbal',
  'Zesty',
  'Earthy',
];

/**
 * Curated cuisine-to-flavor suggestions.
 */
const CUISINE_FLAVOR_MAP: Record<string, FlavorTag[]> = {
  mexican: ['Spicy', 'Tangy', 'Smoky', 'Fresh'],
  japanese: ['Umami', 'Fresh', 'Sweet', 'Salty'],
  italian: ['Rich', 'Herbal', 'Umami', 'Tangy'],
  chinese: ['Umami', 'Spicy', 'Rich', 'Sweet'],
  sichuan: ['Spicy', 'Umami', 'Rich', 'Zesty'],
  thai: ['Spicy', 'Tangy', 'Sweet', 'Herbal'],
  vietnamese: ['Fresh', 'Herbal', 'Tangy', 'Spicy'],
  indian: ['Spicy', 'Rich', 'Earthy', 'Herbal'],
  korean: ['Spicy', 'Umami', 'Tangy', 'Sweet'],
  american: ['Rich', 'Smoky', 'Salty', 'Sweet'],
  bbq: ['Smoky', 'Sweet', 'Rich', 'Salty'],
  mediterranean: ['Fresh', 'Herbal', 'Tangy', 'Rich'],
  greek: ['Fresh', 'Tangy', 'Herbal', 'Salty'],
  french: ['Rich', 'Herbal', 'Umami', 'Sweet'],
  middle_eastern: ['Herbal', 'Earthy', 'Tangy', 'Fresh'],
  spanish: ['Smoky', 'Rich', 'Salty', 'Fresh'],
  caribbean: ['Spicy', 'Sweet', 'Smoky', 'Zesty'],
};

/**
 * Keywords in dish names mapped to characteristic flavor tags.
 */
const DISH_KEYWORD_MAP: { keywords: string[]; flavors: FlavorTag[] }[] = [
  {
    keywords: ['curry', 'masala', 'vindaloo', 'tikka', 'chili', 'spicy', 'hot', 'buffalo', 'jalapeno', 'habanero'],
    flavors: ['Spicy', 'Rich', 'Earthy'],
  },
  {
    keywords: ['ramen', 'dashi', 'miso', 'pho', 'broth', 'truffle', 'mushroom', 'steak', 'beef', 'gravy'],
    flavors: ['Umami', 'Rich', 'Salty'],
  },
  {
    keywords: ['taco', 'ceviche', 'lemon', 'lime', 'citrus', 'pickled', 'vinaigrette', 'sour', 'tart', 'margarita'],
    flavors: ['Tangy', 'Zesty', 'Fresh'],
  },
  {
    keywords: ['cake', 'cookie', 'ice cream', 'dessert', 'chocolate', 'caramel', 'honey', 'waffle', 'pancake', 'sweet'],
    flavors: ['Sweet', 'Rich'],
  },
  {
    keywords: ['bbq', 'barbecue', 'smoked', 'brisket', 'charred', 'grilled', 'roast', 'bacon'],
    flavors: ['Smoky', 'Rich', 'Salty'],
  },
  {
    keywords: ['salad', 'crudo', 'sashimi', 'spring roll', 'mint', 'basil', 'cilantro', 'fresh', 'raw', 'greens'],
    flavors: ['Fresh', 'Herbal', 'Zesty'],
  },
  {
    keywords: ['tempura', 'fried', 'crispy', 'chips', 'crust', 'crunchy', 'schnitzel', 'wings'],
    flavors: ['Crispy', 'Salty', 'Rich'],
  },
  {
    keywords: ['pasta', 'carbonara', 'alfredo', 'cheese', 'burger', 'butter', 'creamy', 'fondue'],
    flavors: ['Rich', 'Umami', 'Salty'],
  },
];

/**
 * Derives recommended flavor tags based on the selected cuisine and/or dish name.
 * Prioritizes matching tags at the beginning, followed by remaining tags.
 */
export function suggestFlavors(cuisine?: string, dishName?: string): FlavorTag[] {
  const suggestedSet = new Set<FlavorTag>();

  // 1. Check cuisine
  if (cuisine) {
    const normalized = cuisine.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const [key, tags] of Object.entries(CUISINE_FLAVOR_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        tags.forEach((t) => suggestedSet.add(t));
      }
    }
  }

  // 2. Check dish name keywords
  if (dishName) {
    const lowerName = dishName.toLowerCase();
    for (const rule of DISH_KEYWORD_MAP) {
      if (rule.keywords.some((kw) => lowerName.includes(kw))) {
        rule.flavors.forEach((t) => suggestedSet.add(t));
      }
    }
  }

  // Default fallback if no hints: common culinary dimensions
  if (suggestedSet.size === 0) {
    return ALL_FLAVOR_TAGS;
  }

  // Put suggested flavors first, then append unselected ones
  const ordered: FlavorTag[] = Array.from(suggestedSet);
  for (const tag of ALL_FLAVOR_TAGS) {
    if (!suggestedSet.has(tag)) {
      ordered.push(tag);
    }
  }

  return ordered;
}

/**
 * Toggle a flavor tag in an array with an upper limit (default: 3).
 * If the tag already exists, it is deselected.
 * If at maximum capacity, the new selection is ignored (or callers can notify).
 */
export function toggleFlavorTag(
  current: FlavorTag[],
  tag: FlavorTag,
  maxCount: number = 3
): FlavorTag[] {
  if (current.includes(tag)) {
    return current.filter((t) => t !== tag);
  }
  if (current.length >= maxCount) {
    return current;
  }
  return [...current, tag];
}

/**
 * Formats notes with attached flavor tags for persistent storage.
 */
export function formatSensoryNotesWithFlavors(
  notes: string,
  flavorTags: FlavorTag[]
): string {
  const cleanNotes = notes.trim();
  if (!flavorTags || flavorTags.length === 0) {
    return cleanNotes;
  }

  const tagHeader = `[Flavors: ${flavorTags.join(', ')}]`;
  if (!cleanNotes) {
    return tagHeader;
  }

  // Avoid duplicate tags if already present
  if (cleanNotes.startsWith('[Flavors:')) {
    const endBracket = cleanNotes.indexOf(']');
    if (endBracket !== -1) {
      const rest = cleanNotes.slice(endBracket + 1).trim();
      return rest ? `${tagHeader}\n${rest}` : tagHeader;
    }
  }

  return `${tagHeader}\n${cleanNotes}`;
}

/**
 * Extracts flavor tags previously stored inside sensory notes.
 */
export function parseFlavorsFromSensoryNotes(notes?: string | null): {
  flavorTags: FlavorTag[];
  cleanNotes: string;
} {
  if (!notes) {
    return { flavorTags: [], cleanNotes: '' };
  }

  const match = notes.match(/^\[Flavors:\s*([^\]]+)\]\s*\n?/);
  if (!match) {
    return { flavorTags: [], cleanNotes: notes };
  }

  const parsed = match[1]
    .split(',')
    .map((s) => s.trim() as FlavorTag)
    .filter((s) => ALL_FLAVOR_TAGS.includes(s));

  const cleanNotes = notes.replace(match[0], '').trim();
  return { flavorTags: parsed, cleanNotes };
}
