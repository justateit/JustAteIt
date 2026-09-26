import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LiquidGlass from './LiquidGlass';

/**
 * In-app message banner, styled to match the app instead of the platform's bare
 * alert() dialog.
 *
 * Successes fade themselves out — confirming a save shouldn't cost the user a
 * tap. Errors stay until dismissed, because a failed save is something they
 * need to notice and act on.
 *
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   setToast({ message: 'Log archived', type: 'success' });
 *   <AppToast toast={toast} onDismiss={() => setToast(null)} />
 */
export default function AppToast({ toast, onDismiss }) {
  // useState rather than useRef so the value is created once without tripping
  // the react-hooks/refs lint rule that CI enforces.
  const [anim] = useState(() => new Animated.Value(0));
  const isError = toast?.type === 'error';

  // The parent's `toast` is the single source of truth — mirroring it into local
  // state here would mean calling setState inside an effect, which React now
  // flags as a cascading render. Dismissal runs the exit animation, then hands
  // control back to the parent to clear the prop, which unmounts this.
  const dismiss = () => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(
      () => onDismiss?.(),
    );
  };

  useEffect(() => {
    if (!toast?.message) return;

    Animated.spring(anim, {
      toValue: 1,
      friction: 9,
      tension: 70,
      useNativeDriver: true,
    }).start();

    // Errors wait for a tap; successes clear themselves.
    if (toast.type === 'error') return;

    const timer = setTimeout(dismiss, 2400);
    return () => clearTimeout(timer);
    // dismiss/onDismiss are intentionally omitted: they are new closures on every
    // parent render, and including them would restart the timer each time.
  }, [toast, anim]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast?.message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={styles.touch}>
        <LiquidGlass tint="light" borderRadius={16} style={styles.glass}>
          <View style={styles.row}>
            <Ionicons
              name={isError ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={isError ? '#D92D20' : '#FF6B4A'}
            />
            <Text style={[styles.text, isError && styles.textError]} numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </LiquidGlass>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  touch: {
    maxWidth: 420,
    width: '88%',
  },
  glass: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  textError: {
    color: '#7A1710',
  },
});
