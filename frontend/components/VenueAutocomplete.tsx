/**
 * VenueAutocomplete.tsx
 *
 * A zero-cost replacement for react-native-google-places-autocomplete.
 * Uses the Nominatim public search API (OpenStreetMap) — no API key required.
 *
 * Debounce: 350 ms to stay well under Nominatim's 1 req/sec guideline.
 * Filters results to amenity types that are food-relevant.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VenueSuggestion {
  /** Display name of the place */
  name: string;
  /** Secondary address / city string */
  address: string;
  /** Raw Nominatim display_name */
  fullName: string;
}

interface Props {
  /** Displayed in the text field when empty */
  placeholder?: string;
  /** Pre-fill text (e.g. when editing an existing log) */
  defaultValue?: string;
  /** Called when the user selects a result */
  onSelect: (suggestion: VenueSuggestion) => void;
  /** Optional style overrides for the outer container */
  containerStyle?: ViewStyle;
}

// ── Nominatim helpers ─────────────────────────────────────────────────────────

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_HEADERS = {
  'User-Agent': 'JustAteIt-App/1.0 (dev@justateit.app)',
  'Accept-Language': 'en',
};
// Food-relevant OSM amenity / shop classes
const FOOD_CLASSES = new Set([
  'restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court',
  'ice_cream', 'bakery', 'bistro', 'biergarten',
]);

async function queryNominatim(text: string): Promise<VenueSuggestion[]> {
  const params = new URLSearchParams({
    q: text,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
  });

  const url = `${NOMINATIM_URL}?${params}`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];

  const data: any[] = await res.json();

  const suggestions: VenueSuggestion[] = [];
  for (const item of data) {
    const cls = (item.category ?? item.class ?? '').toLowerCase();
    const type = (item.type ?? '').toLowerCase();
    
    // Accept food amenities, buildings, shops, places, or any place with a recognizable name
    const isFood = (cls === 'amenity' && FOOD_CLASSES.has(type)) || FOOD_CLASSES.has(type);
    const isPlace = ['building', 'place', 'shop', 'tourism', 'leisure'].includes(cls);
    const hasName = Boolean(item.name);

    if (!isFood && !isPlace && !hasName) continue;

    const addr = item.address ?? {};
    const shortName =
      item.name ||
      item.display_name?.split(',')[0] ||
      '';
    const city =
      addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
    const road = addr.road || '';
    const address = [road, city].filter(Boolean).join(', ') || item.display_name;

    if (!shortName) continue;
    suggestions.push({
      name: shortName,
      address,
      fullName: item.display_name,
    });
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 350;

export default function VenueAutocomplete({
  placeholder = 'Search for a restaurant…',
  defaultValue = '',
  onSelect,
  containerStyle,
}: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest request so stale results don't overwrite newer ones
  const requestId = useRef(0);

  const search = useCallback(async (text: string) => {
    const thisId = ++requestId.current;
    if (text.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const results = await queryNominatim(text);
      if (thisId !== requestId.current) return; // stale
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      if (thisId !== requestId.current) return;
      setSuggestions([]);
    } finally {
      if (thisId === requestId.current) setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => search(text), DEBOUNCE_MS);
  };

  const handleSelect = (item: VenueSuggestion) => {
    setQuery(item.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(item);
  };

  // Sync defaultValue on prop change (e.g. draft loaded)
  useEffect(() => {
    if (defaultValue && defaultValue !== query) {
      setQuery(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  const inputBg = isDark ? 'rgba(40,40,40,0.65)' : 'rgba(255,255,255,0.65)';
  const textColor = Colors[colorScheme].text;
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(60,60,67,0.3)';
  const dropdownBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(80,80,80,0.9)' : 'rgba(255,255,255,0.9)';
  const rowBorderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={query}
          onChangeText={handleChangeText}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          testID="venue-autocomplete-input"
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color="#FF6B4A"
            style={styles.spinner}
          />
        )}
      </View>

      {open && (
        <View style={[styles.dropdown, { backgroundColor: dropdownBg, borderColor }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.row,
                  { borderBottomColor: rowBorderColor },
                  index === suggestions.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
                testID={`venue-suggestion-${index}`}
              >
                <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address ? (
                  <Text style={styles.rowAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 999,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  spinner: {
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 1000,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowAddress: {
    fontSize: 12,
    color: '#8A8A8E',
    marginTop: 2,
  },
});
