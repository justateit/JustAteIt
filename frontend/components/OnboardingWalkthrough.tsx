import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { markOnboardingComplete } from '@/utils/onboardingStorage';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

export type OnboardingSlide = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

const DEFAULT_SLIDES: OnboardingSlide[] = [
  {
    key: '1',
    title: 'Capture every meal',
    subtitle: 'Snap or log dishes in seconds so your food diary stays effortless.',
    icon: 'camera',
  },
  {
    key: '2',
    title: 'Discover great spots',
    subtitle: 'Explore venues and plates tailored to how you actually eat.',
    icon: 'map-pin',
  },
  {
    key: '3',
    title: 'Own your flavor story',
    subtitle: 'Build a profile that reflects your tastes — not generic recommendations.',
    icon: 'award',
  },
];

type Props = {
  slides?: OnboardingSlide[];
  /** Clerk auth entry (default matches Loadingscreen primary CTA). */
  authHref?: '/sign-in' | '/sign-up';
};

export default function OnboardingWalkthrough({
  slides = DEFAULT_SLIDES,
  authHref = '/sign-in',
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToAuth = useCallback(async () => {
    await markOnboardingComplete();
    router.replace(authHref);
  }, [router, authHref]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(width, 1));
      setActiveIndex(Math.min(Math.max(next, 0), slides.length - 1));
    },
    [width, slides.length],
  );

  const handlePrimary = useCallback(() => {
    if (activeIndex < slides.length - 1) {
      const next = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      void goToAuth();
    }
  }, [activeIndex, slides.length, goToAuth]);

  const renderItem: ListRenderItem<OnboardingSlide> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width }]}>
        <View style={styles.illustrationWrap}>
          <View style={styles.illustrationCard}>
            <Feather name={item.icon} size={56} color="rgba(245,237,224,0.35)" />
            <Text style={styles.placeholderLabel}>Illustration</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    ),
    [width],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  return (
    <LinearGradient colors={['#100B06', '#1E1109', '#120904']} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <TouchableOpacity onPress={() => void goToAuth()} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={slides}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={({ index }) => {
            const w = Dimensions.get('window').width;
            listRef.current?.scrollToOffset({ offset: index * w, animated: true });
          }}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((s, i) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handlePrimary} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {activeIndex < slides.length - 1 ? 'Next' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  list: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  topSpacer: { flex: 1 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(245,237,224,0.42)',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  illustrationCard: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1.05,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.14)',
    backgroundColor: 'rgba(255,248,240,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: 'rgba(245,237,224,0.28)',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: serifFont,
    fontSize: 34,
    lineHeight: 40,
    color: '#F5EDE0',
    marginBottom: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(245,237,224,0.58)',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: Platform.select({ ios: 28, default: 20 }),
    paddingTop: 8,
    gap: 28,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#E86A33',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(245,237,224,0.2)',
  },
  primaryBtn: {
    backgroundColor: '#E86A33',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 2,
  },
});
