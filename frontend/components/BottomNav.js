import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';

export default function BottomNav() {
  const insets = useSafeAreaInsets();

  // Calculated dimensions to ensure the halo matches the pill size
  const pillWidth = 160;
  const pillHeight = 24 + 14 + 2;
  const pillRadius = 50;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">

      {/* --- THE FEATHERED EDGE HALO --- */}
      <View style={[styles.haloContainer, {
        width: pillWidth + 20,
        height: pillHeight + 20,
        borderRadius: pillRadius + 10
      }]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.05)',
            'transparent'
          ]}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* --- THE MAIN 3D MOLDED LIQUID GLASS PILL --- */}
      <View style={styles.shadowContainer}>
        <LiquidGlass
          intensity={65}
          borderRadius={pillRadius}
          style={styles.pill}
        >
          <View style={[styles.pillInner, { width: pillWidth, borderRadius: pillRadius }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircleDark}>
                <Ionicons name="compass" size={20} color="#1d1d1f" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/record-experience')}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircleOrange}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircleDark}>
                <Ionicons name="person-outline" size={20} color="#1d1d1f" />
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
  haloContainer: {
    position: 'absolute',
    bottom: 2,
    opacity: 0.5,
    overflow: 'hidden',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 0,
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