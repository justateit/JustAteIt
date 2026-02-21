import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/index') return null;

  // Calculated dimensions to ensure the halo matches the pill size
  const pillWidth = 160;
  // Approx height based on icon size (24) + paddingVertical (7*2) + border
  const pillHeight = 24 + 14 + 2; 
  const pillRadius = 50;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
      
      {/* --- THE FEATHERED EDGE HALO --- */}
      {/* This sits behind the main pill and is slightly larger, creating the soft glow */}
      <View style={[styles.haloContainer, { 
          width: pillWidth + 20, 
          height: pillHeight + 20,
          borderRadius: pillRadius + 10
        }]}>
         <LinearGradient
           colors={[
             'rgba(255, 255, 255, 0.2)', // Soft white light near the edge
             'rgba(255, 255, 255, 0.05)', 
             'transparent' // Fades out completely
           ]}
           // Using diagonal gradient to simulate a rounded radial fade roughly
           start={{ x: 0.2, y: 0.2 }}
           end={{ x: 1, y: 1 }}
           style={StyleSheet.absoluteFill}
         />
      </View>


      {/* --- THE MAIN GLASS PILL --- */}
      <View style={styles.shadowContainer}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 50}
          tint="systemMaterialDark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[styles.pill, { borderRadius: pillRadius }]}
        >
          {/* Internal surface sheen gradient */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.1)', 
              'rgba(255, 255, 255, 0.02)',
              'transparent',
            ]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.pillInner, { width: pillWidth, borderRadius: pillRadius }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircleWhite}>
                <Ionicons name="compass" size={20} color="#111" />
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
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </BlurView>
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
    // Ensure the wrapper is tall enough so the halo doesn't get clipped
    height: 100, 
    justifyContent: 'flex-end',
  },
  // New style for the feathering effect
  haloContainer: {
    position: 'absolute',
    // Center the halo behind the main pill
    bottom: 2, // Offset slightly depending on shadow settings
    opacity: 0.6, // Adjust overall strength of the feathering
    overflow: 'hidden',
    // Use a very soft shadow on the halo itself to assist the gradient fade
    shadowColor: '#FFF', 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 0,
  },
  shadowContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4, // Slightly reduced opacity
    shadowRadius: 22,   // Increased radius for softer drop shadow
    elevation: 20,
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
    backgroundColor: 'rgba(20, 20, 20, 0.4)', 
    // Decreased border width to reduce harshness
    borderWidth: 0.8, 
    // Reduced border opacities significantly so they don't look like hard lines
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  iconCircleWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});