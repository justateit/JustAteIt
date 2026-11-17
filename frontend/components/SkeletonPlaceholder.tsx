import React, { useEffect, useState } from 'react';
import {
  Animated,
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';

export const DEFAULT_FOOD_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export interface SkeletonPlaceholderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Clean, zero-dependency animated Skeleton Placeholder component.
 * Uses React Native's native-driver Animated API to pulse smoothly,
 * adapting automatically to Dark/Light theme colors.
 */
export function SkeletonPlaceholder({
  width,
  height,
  borderRadius = 8,
  style,
  children,
}: SkeletonPlaceholderProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacity]);

  const baseColor = isDark ? '#2C2D30' : '#E2DCD2';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Realistic skeleton for HorizontalDishCard.
 * Matches exact dimensions: 100% width, 220px height, 18px border radius.
 */
export function DishCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? Colors.dark.card : Colors.light.card;
  const innerColor = isDark ? '#383A40' : '#D5CFC5';

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg }, style]}>
      {/* Background card base */}
      <SkeletonPlaceholder width="100%" height="100%" borderRadius={18} style={StyleSheet.absoluteFill}>
        {/* Rating badge placeholder top right */}
        <View style={styles.badgePosition}>
          <View style={[styles.skeletonBadge, { backgroundColor: innerColor }]} />
        </View>

        {/* Bottom text info placeholders */}
        <View style={styles.cardBottom}>
          <View style={[styles.skeletonTitle, { backgroundColor: innerColor }]} />
          <View style={[styles.skeletonSubtitleRow, { backgroundColor: innerColor }]} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
}

/**
 * Realistic skeleton for trending DishCard (horizontal list).
 * Matches dimensions: 200px width, 260px height, 18px border radius.
 */
export function TrendingDishCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? Colors.dark.card : Colors.light.card;
  const innerColor = isDark ? '#383A40' : '#D5CFC5';

  return (
    <View style={[styles.trendingContainer, { backgroundColor: cardBg }, style]}>
      <SkeletonPlaceholder width={200} height={260} borderRadius={18}>
        <View style={styles.badgePosition}>
          <View style={[styles.skeletonBadge, { backgroundColor: innerColor }]} />
        </View>
        <View style={styles.cardBottom}>
          <View style={[styles.skeletonTitle, { width: 140, backgroundColor: innerColor }]} />
          <View style={[styles.skeletonSubtitleRow, { width: 100, backgroundColor: innerColor }]} />
        </View>
      </SkeletonPlaceholder>
    </View>
  );
}

/**
 * Realistic skeleton for Profile stat counts (e.g. DISHES count).
 */
export function StatSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonPlaceholder
      width={42}
      height={22}
      borderRadius={6}
      style={[{ marginVertical: 3 }, style]}
    />
  );
}

/**
 * Full page skeleton layout for Discover / Home screen during font/data loading.
 */
export function DiscoverSkeleton() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  return (
    <View style={[styles.discoverContainer, { backgroundColor: bg }]}>
      {/* Title skeleton */}
      <SkeletonPlaceholder width={220} height={48} borderRadius={10} style={{ marginTop: 80, marginBottom: 10 }} />
      <SkeletonPlaceholder width={180} height={14} borderRadius={4} style={{ marginBottom: 35 }} />

      {/* SearchBar skeleton */}
      <SkeletonPlaceholder width="100%" height={50} borderRadius={16} style={{ marginBottom: 30 }} />

      {/* Trending Header */}
      <SkeletonPlaceholder width={160} height={16} borderRadius={4} style={{ marginBottom: 16 }} />

      {/* Trending horizontal cards */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 35 }}>
        <TrendingDishCardSkeleton />
        <TrendingDishCardSkeleton />
      </View>

      {/* Fresh Logs Header */}
      <SkeletonPlaceholder width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />

      {/* Fresh Logs vertical list */}
      <DishCardSkeleton style={{ marginBottom: 14 }} />
      <DishCardSkeleton style={{ marginBottom: 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  trendingContainer: {
    width: 200,
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  badgePosition: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  skeletonBadge: {
    width: 48,
    height: 24,
    borderRadius: 12,
  },
  cardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 8,
  },
  skeletonTitle: {
    width: '65%',
    height: 18,
    borderRadius: 6,
  },
  skeletonSubtitleRow: {
    width: '45%',
    height: 12,
    borderRadius: 4,
  },
  discoverContainer: {
    flex: 1,
    padding: 20,
  },
});
