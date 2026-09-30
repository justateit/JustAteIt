import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme-context';
import LiquidGlass from './LiquidGlass';

export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const pillWidth = 160;
  const pillRadius = 50;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
      {/* --- THE MAIN 3D MOLDED LIQUID GLASS PILL --- */}
      <View style={styles.shadowContainer}>
        <LiquidGlass
          tint={isDark ? 'dark' : 'light'}
          intensity={65}
          borderRadius={pillRadius}
          style={styles.pill}
        >
          <View style={[styles.pillInner, { width: pillWidth, borderRadius: pillRadius }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleDark, isDark && styles.iconCircleDarkTheme]}>
                <Ionicons name="compass" size={20} color={isDark ? '#FFFFFF' : '#1d1d1f'} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.replace('/record-experience')}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircleOrange}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.replace('/profile')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleDark, isDark && styles.iconCircleDarkTheme]}>
                <Ionicons name="person-outline" size={20} color={isDark ? '#FFFFFF' : '#1d1d1f'} />
              </View>
            </TouchableOpacity>
          </View>
        </LiquidGlass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
    height: 100,
    justifyContent: 'flex-end',
  },
  shadowContainer: {
    borderRadius: 50,
  },
  pill: {
    overflow: 'hidden',
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  iconCircleDark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDarkTheme: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconCircleOrange: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B4A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});