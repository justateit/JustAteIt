import React from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * LiquidGlass Component
 * Combines the SahilWebsite/portfolio-next bevel aesthetic with
 * expo-blur's BlurView so the surface refracts & tints whatever
 * sits beneath it — exactly like the web version's frosted glass
 * over the ambient colour field.
 *
 * Visual layers (bottom → top):
 *  1. BlurView — frosted backdrop that picks up underlying colours
 *  2. Translucent 135° white gradient wash (from .lg-glass CSS)
 *  3. Soft top-lit specular sheen gradient
 *  4. Content
 *
 * Shadow & border are kept minimal — a single soft float shadow
 * and a thin white rim, matching the reference's inset 0 0 0 1px.
 */
export default function LiquidGlass({
    intensity = 60,
    tint = 'light',
    borderRadius = 26,
    style,
    children,
    ...rest
}) {
    // Separate shadow-only props for the outer wrapper from layout props
    // that need to reach the glass surface where children actually live.
    const flatStyle = StyleSheet.flatten(style) || {};
    const {
        // These go on the outer shadow wrapper only
        shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation,
        margin, marginTop, marginBottom, marginLeft, marginRight,
        marginHorizontal, marginVertical,
        // Everything else flows to the glass surface
        ...layoutStyle
    } = flatStyle;

    const outerStyle = {
        shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation,
        margin, marginTop, marginBottom, marginLeft, marginRight,
        marginHorizontal, marginVertical,
    };

    return (
        <View style={[styles.shadowWrapper, { borderRadius }, outerStyle]} {...rest}>
            <View style={[styles.glassSurface, { borderRadius }, layoutStyle]}>

                {/* 1. Frosted Backdrop — refracts colours underneath */}
                <BlurView
                    intensity={Platform.OS === 'ios' ? intensity : Math.min(intensity, 40)}
                    tint={tint}
                    experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                    style={StyleSheet.absoluteFill}
                />

                {/* 2. Translucent gradient fill — from .lg-glass CSS:
                     linear-gradient(135deg, rgba(255,255,255,0.26), rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.16)) */}
                <LinearGradient
                    colors={[
                        'rgba(255, 255, 255, 0.26)',
                        'rgba(255, 255, 255, 0.08)',
                        'rgba(255, 255, 255, 0.16)',
                    ]}
                    locations={[0, 0.6, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* 3. Top-lit specular sheen — subtle highlight matching
                     the reference's inset 1.8px 3px white highlights.
                     Kept deliberately soft so it reads as a gentle lit edge. */}
                <LinearGradient
                    colors={[
                        'rgba(255, 255, 255, 0.30)',
                        'rgba(255, 255, 255, 0.06)',
                        'transparent',
                    ]}
                    start={{ x: 0.05, y: 0 }}
                    end={{ x: 0.6, y: 0.85 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* 4. Content — rendered directly in the glass surface */}
                {children}
            </View>
        </View>
    );
}

/**
 * GlassCard — card variant matching .lg-glass + .lg-glass-hover
 */
export function GlassCard({ children, style, borderRadius = 26, ...props }) {
    return (
        <LiquidGlass
            tint="light"
            intensity={65}
            borderRadius={borderRadius}
            style={style}
            {...props}
        >
            {children}
        </LiquidGlass>
    );
}

/**
 * GlassButton — pill button matching .lg-pill from the reference.
 * Primary variant is a solid dark button.
 */
export function GlassButton({ children, onPress, primary = false, style, ...props }) {
    if (primary) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                style={[styles.primaryButton, style]}
                {...props}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={style} {...props}>
            <LiquidGlass
                tint="light"
                intensity={70}
                borderRadius={50}
                style={styles.glassButtonPadding}
            >
                {children}
            </LiquidGlass>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    /* Single float shadow — combines the reference's two outer shadows:
       0 1px 5px rgba(0,0,0,0.10)  +  0 8px 24px rgba(17,24,39,0.10)
       into one soft layer to avoid doubling on mobile */
    shadowWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    /* The glass pane — NO border. The SahilWebsite's .lg-glass class
       has zero border; its edge definition is purely from box-shadow
       insets, which we approximate with the gradient layers above. */
    glassSurface: {
        overflow: 'hidden',
    },
    primaryButton: {
        backgroundColor: '#1d1d1f',
        borderRadius: 50,
        paddingHorizontal: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    glassButtonPadding: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
