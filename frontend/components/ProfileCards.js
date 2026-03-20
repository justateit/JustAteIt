import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKS = 7; // rows

/** Generate mock heatmap data: 12 months × 7 rows */
function generateHeatmap() {
    const seed = [
        [0, 2, 4, 3, 0, 1, 0],
        [3, 4, 5, 4, 2, 3, 1],
        [4, 5, 5, 3, 4, 2, 0],
        [2, 3, 4, 5, 3, 4, 2],
        [5, 4, 3, 2, 4, 5, 1],
        [3, 2, 4, 3, 1, 2, 0],
        [4, 5, 3, 4, 2, 3, 2],
        [2, 3, 5, 4, 3, 2, 1],
        [3, 4, 2, 3, 4, 5, 2],
        [5, 3, 4, 2, 3, 4, 1],
        [2, 4, 3, 5, 2, 3, 2],
        [1, 2, 3, 2, 1, 0, 0],
    ];
    return seed;
}

/** Colour for a heat value 0-5 */
function heatColor(v) {
    if (v === 0) return '#2a2a2a';
    if (v === 1) return '#5c2e1a';
    if (v === 2) return '#8b4513';
    if (v === 3) return '#c4581a';
    if (v === 4) return '#e0712a';
    return '#FF6B4A';
}

// ─────────────────────────────────────────────────────────────────────────────
// Dining Frequency Heatmap
// ─────────────────────────────────────────────────────────────────────────────
export function DiningFrequencyCard() {
    const data = useMemo(generateHeatmap, []);
    const GAP = 2;
    const COLS = 12;
    const [cellSize, setCellSize] = useState(10);

    function onGridLayout(e) {
        const gridWidth = e.nativeEvent.layout.width;
        const size = (gridWidth - GAP * (COLS - 1)) / COLS;
        setCellSize(Math.max(4, size));
    }

    return (
        <View style={styles.glassCard}>
            {/* Glass surface */}
            <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={[
                    'rgba(255,255,255,0.07)',
                    'rgba(255,255,255,0.02)',
                    'transparent',
                ]}
                style={StyleSheet.absoluteFill}
            />

            {/* Content */}
            <View style={styles.cardInner}>
                {/* Title */}
                <View style={styles.heatTitle}>
                    <Ionicons name="flame-outline" size={14} color="#FF6B4A" />
                    <Text style={styles.heatTitleText}>DINING FREQUENCY</Text>
                </View>

                {/* Month labels */}
                <View style={styles.monthRow}>
                    {MONTHS.map((m) => (
                        <Text key={m} style={styles.monthLabel}>{m}</Text>
                    ))}
                </View>

                {/* Heatmap grid — rows = weeks, cols = months */}
                <View style={styles.grid} onLayout={onGridLayout}>
                    {Array.from({ length: WEEKS }).map((_, row) => (
                        <View key={row} style={styles.gridRow}>
                            {MONTHS.map((_, col) => (
                                <View
                                    key={col}
                                    style={[
                                        styles.cell,
                                        {
                                            width: cellSize,
                                            height: cellSize,
                                            marginRight: col < COLS - 1 ? GAP : 0,
                                            backgroundColor: heatColor(data[col][row]),
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    <Text style={styles.legendText}>LESS</Text>
                    {[0, 1, 2, 3, 4].map((v) => (
                        <View
                            key={v}
                            style={[styles.legendCell, { backgroundColor: heatColor(v) }]}
                        />
                    ))}
                    <Text style={styles.legendText}>MORE</Text>
                </View>
            </View>

            {/* Glass border */}
            <View style={styles.glassBorder} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Taste DNA Radar Chart (pure RN — no SVG lib needed)
// ─────────────────────────────────────────────────────────────────────────────
const RADAR_SIZE = 130;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_LABELS = [
    { label: 'Spice', angle: -90 },  // top
    { label: 'Acid', angle: -18 },  // top-right
    { label: 'Umami', angle: 54 },  // bottom-right
    { label: 'Sweet', angle: 126 },  // bottom-left
    { label: 'Texture', angle: 198 },  // top-left
];
// Scores 0-1 for each axis (Spice, Acid, Umami, Sweet, Texture)
const SCORES = [0.35, 0.5, 0.7, 0.3, 0.45];

function toRad(deg) { return (deg * Math.PI) / 180; }

function radarPoint(angle, score, r) {
    const rad = toRad(angle);
    return {
        x: RADAR_CENTER + r * score * Math.cos(rad),
        y: RADAR_CENTER + r * score * Math.sin(rad),
    };
}

/** Draws a single polygon ring as an outline using rotated thin views */
function RadarRing({ fraction, r, color = 'rgba(255,255,255,0.08)' }) {
    const points = RADAR_LABELS.map((l) => radarPoint(l.angle, fraction, r));
    const n = points.length;

    return (
        <>
            {points.map((p, i) => {
                const next = points[(i + 1) % n];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: p.x,
                            top: p.y,
                            width: length,
                            height: 1,
                            backgroundColor: color,
                            transform: [{ rotate: `${angle}deg` }],
                            transformOrigin: 'left center',
                        }}
                    />
                );
            })}
        </>
    );
}

/** Filled polygon for the score shape */
function RadarShape({ r }) {
    const points = RADAR_LABELS.map((l, i) => radarPoint(l.angle, SCORES[i], r));
    const n = points.length;

    return (
        <>
            {/* Filled triangles from center to each edge */}
            {points.map((p, i) => {
                const next = points[(i + 1) % n];
                const dx = next.x - p.x;
                const dy = next.y - p.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: p.x,
                            top: p.y,
                            width: length,
                            height: 2,
                            backgroundColor: '#FF6B4A',
                            opacity: 0.85,
                            transform: [{ rotate: `${angle}deg` }],
                            transformOrigin: 'left center',
                        }}
                    />
                );
            })}
            {/* Dot at each vertex */}
            {points.map((p, i) => (
                <View
                    key={`dot-${i}`}
                    style={{
                        position: 'absolute',
                        left: p.x - 3,
                        top: p.y - 3,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#FF6B4A',
                    }}
                />
            ))}
        </>
    );
}

export function TasteDNACard() {
    const R = RADAR_SIZE * 0.38; // max radius

    return (
        <View style={styles.glassCard}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={StyleSheet.absoluteFill}
            />
            {/* Base dark gradient */}
            <LinearGradient
                colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />
            {/* Orange light leak — bottom-right */}
            <LinearGradient
                colors={['transparent', 'transparent', 'rgba(255,107,74,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            {/* Orange light leak — top-left */}
            <LinearGradient
                colors={['rgba(255,107,74,0.10)', 'transparent', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.cardInner}>
                <Text style={styles.dnaTitle}>TASTE DNA</Text>

                {/* Radar */}
                <View style={{ width: RADAR_SIZE, height: RADAR_SIZE, position: 'relative', alignSelf: 'center', marginTop: 8 }}>
                    {/* Background rings */}
                    <RadarRing fraction={1} r={R} />
                    <RadarRing fraction={0.67} r={R} />
                    <RadarRing fraction={0.33} r={R} />
                    {/* Axis spokes */}
                    {RADAR_LABELS.map((l, i) => {
                        const tip = radarPoint(l.angle, 1, R);
                        const dx = tip.x - RADAR_CENTER;
                        const dy = tip.y - RADAR_CENTER;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
                        return (
                            <View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: RADAR_CENTER,
                                    top: RADAR_CENTER,
                                    width: len,
                                    height: 1,
                                    backgroundColor: 'rgba(255,255,255,0.10)',
                                    transform: [{ rotate: `${ang}deg` }],
                                    transformOrigin: 'left center',
                                }}
                            />
                        );
                    })}
                    {/* Score shape */}
                    <RadarShape r={R} />
                    {/* Labels */}
                    {RADAR_LABELS.map((l, i) => {
                        const tip = radarPoint(l.angle, 1.3, R);
                        return (
                            <Text
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: tip.x - 28,
                                    top: tip.y - 8,
                                    width: 56,
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.55)',
                                    fontSize: 9,
                                    letterSpacing: 0.5,
                                    fontWeight: '600',
                                }}
                            >
                                {l.label}
                            </Text>
                        );
                    })}
                </View>

                {/* Personality label */}
                <Text style={styles.dnaPersonality}>"Umami Seeker"</Text>
            </View>

            <View style={styles.glassBorder} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    glassCard: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(20,20,20,0.75)',
        minHeight: 200,
    },
    glassBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.12)',
        pointerEvents: 'none',
    },
    cardInner: {
        flex: 1,
        padding: 14,
    },

    // Heatmap
    heatTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    heatTitleText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    monthRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    monthLabel: {
        flex: 1,
        color: 'rgba(255,255,255,0.35)',
        fontSize: 7,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    grid: {
        gap: 2,
    },
    gridRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    cell: {
        borderRadius: 2,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 8,
    },
    legendCell: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Taste DNA
    dnaTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    dnaPersonality: {
        marginTop: 10,
        textAlign: 'center',
        color: '#FF6B4A',
        fontSize: 13,
        fontStyle: 'italic',
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        letterSpacing: 0.3,
    },
});
