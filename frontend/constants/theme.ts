/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F4F0E6',
    card: '#fff',
    input: '#FAFAF7',
    inputBorder: '#E0DDD5',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    card: '#1E1E1E',
    input: '#2A2A2A',
    inputBorder: '#333',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/**
 * Brand colors and font families actually in use across the app, pulled together
 * here for reference. Existing screens still hold their own hardcoded copies of
 * these values (e.g. '#FF6B4A' appears in 33 places) — nothing has been rewired
 * to import from here yet. This is the canonical list to copy from going forward,
 * and the starting point if those call sites ever get consolidated.
 */
export const BrandColors = {
  accent: '#FF6B4A', // primary orange — buttons, active states, highlights
  accentDeep: '#E86A33', // secondary/burnt-orange variant — profile.js, Loadingscreen.js
  cream: '#F5EDE0', // warm off-white background
  creamAlt: '#F4F0E6', // alternate warm off-white (matches Colors.light.background above)
  textDark: '#1a1a1a',
  textDarkAlt: '#1d1d1f',
  labelMuted: '#8A8A8E', // uppercase field labels / captions
};

/**
 * Font families loaded via expo-font's useFonts, repeated independently in
 * several screens (e.g. app/(tabs)/index.tsx) rather than loaded once globally.
 * 'Georgia' needs no loading — it's a built-in system serif.
 */
export const AppFonts = {
  serif: 'LibreBaskerville',
  serifItalic: 'LibreBaskervilleItalic',
  serifBold: 'LibreBaskerville-Bold',
  systemSerif: 'Georgia',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
