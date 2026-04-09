import { DiningFrequencyCard, TasteDNACard } from '@/components/ProfileCards';
import { useUser } from '@clerk/clerk-expo';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLogs } from '../utils/flavorProfileApi';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatLogDate(isoString) {
    const d = new Date(isoString);
    return { month: MONTH_NAMES[d.getMonth()], day: String(d.getDate()) };
}

export default function App() {
    const router = useRouter();
    const { user } = useUser();

    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        getLogs(user.id)
            .then(data => setLogs(data.logs ?? []))
            .catch(err => console.warn('[Profile] getLogs failed:', err))
            .finally(() => setLogsLoading(false));
    }, [user?.id]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.push('/saved_drafts')}>
                        <Text style={styles.headerText}>View Saved Drafts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
                        <Feather name="settings" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: user?.imageUrl || 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=400&q=80' }}
                            style={styles.avatar}
                        />
                        <View style={styles.editBadge}>
                            <Feather name="edit-2" size={12} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.name}>
                        {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Food Explorer' : 'Food Explorer'}
                    </Text>
                    <Text style={styles.handle}>
                        @{user?.username ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'explorer'}
                    </Text>

                    <Text style={styles.bio}>
                        Chasing fermentation across the globe. Seeking{'\n'}the perfect balance of acid and fat.
                    </Text>

                    {/* Stats — liquid glass */}
                    <View style={styles.statsWrapper}>
                        <BlurView
                            intensity={Platform.OS === 'ios' ? 50 : 35}
                            tint="light"
                            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                            style={StyleSheet.absoluteFill}
                        />
                        <LinearGradient
                            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.15)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{logs.length}</Text>
                                <Text style={styles.statLabel}>DISHES</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>—</Text>
                                <Text style={styles.statLabel}>FOLLOWERS</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>—</Text>
                                <Text style={styles.statLabel}>FOLLOWING</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Info Cards — stacked */}
                <View style={styles.cardsContainer}>
                    <DiningFrequencyCard />
                    <TasteDNACard />
                </View>

                {/* The Journal Section */}
                <View style={styles.journalHeader}>
                    <Text style={styles.journalTitle}>The Journal</Text>
                    <TouchableOpacity>
                        <Feather name="search" size={22} color="#000" />
                    </TouchableOpacity>
                </View>

                <View style={styles.journalFeedContainer}>
                    {logsLoading ? (
                        <ActivityIndicator size="small" color="#E86A33" style={{ marginVertical: 40 }} />
                    ) : logs.length === 0 ? (
                        <View style={styles.emptyJournalContainer}>
                            <FontAwesome name="file-text-o" size={40} color="#DDD" />
                            <Text style={styles.emptyText}>No logs yet. Start by archiving an experience!</Text>
                        </View>
                    ) : (
                        logs.map((item) => {
                            const { month, day } = formatLogDate(item.created_at);
                            const locationStr = [item.venue_name, item.city].filter(Boolean).join(' · ');
                            
                            return (
                                <View key={item.id} style={styles.feedCard}>
                                    {/* Card Header: Date & Location */}
                                    <View style={styles.feedCardHeader}>
                                        <View style={styles.feedBadgeDate}>
                                            <Text style={styles.feedBadgeMonth}>{month}</Text>
                                            <Text style={styles.feedBadgeDay}>{day}</Text>
                                        </View>
                                        <View style={styles.feedCardTitleContainer}>
                                            <Text style={styles.feedDishName} numberOfLines={1}>{item.dish_name}</Text>
                                            <Text style={styles.feedVenueName} numberOfLines={1}>{locationStr || 'Untracked Location'}</Text>
                                        </View>
                                        <View style={styles.feedRatingBadge}>
                                            <Text style={styles.feedRatingText}>{item.rating || '—'}</Text>
                                            <FontAwesome name="star" size={12} color="#E86A33" />
                                        </View>
                                    </View>

                                    {/* Main Image */}
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.feedImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.feedImage, styles.feedImagePlaceholder]}>
                                            <FontAwesome name="image" size={30} color="#EEE" />
                                        </View>
                                    )}

                                    {/* Sensory Note Content */}
                                    {item.sensory_notes && (
                                        <View style={styles.feedNotesContainer}>
                                            <Text style={styles.feedNotesText}>"{item.sensory_notes}"</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Bottom padding for scrollability */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F0E6',
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        color: '#E86A33',
        fontSize: 14,
        fontWeight: '500',
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
        padding: 4,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: '#E86A33',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#000',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F5F4EF',
    },
    name: {
        fontFamily: serifFont,
        fontSize: 32,
        color: '#000',
        marginBottom: 6,
    },
    handle: {
        color: '#E86A33',
        fontSize: 16,
        letterSpacing: 1,
        fontFamily: monoFont,
        marginBottom: 16,
    },
    bio: {
        textAlign: 'center',
        color: '#777',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    statsWrapper: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 40,
        paddingVertical: 18,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontFamily: serifFont,
        fontSize: 20,
        color: '#000',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: '#777',
        letterSpacing: 1,
        fontWeight: '600',
    },
    cardsContainer: {
        gap: 12,
        marginBottom: 40,
    },
    journalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    journalTitle: {
        fontFamily: serifFont,
        fontSize: 24,
        color: '#000',
    },
    journalFeedContainer: {
        width: '100%',
    },
    feedCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    feedCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    feedBadgeDate: {
        backgroundColor: '#F8F8F8',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 12,
    },
    feedBadgeMonth: {
        fontSize: 10,
        color: '#A0A0A0',
        fontWeight: '700',
    },
    feedBadgeDay: {
        fontSize: 14,
        color: '#000',
        fontWeight: '700',
    },
    feedCardTitleContainer: {
        flex: 1,
    },
    feedDishName: {
        fontFamily: serifFont,
        fontSize: 18,
        color: '#000',
        marginBottom: 2,
    },
    feedVenueName: {
        fontSize: 11,
        color: '#888',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    feedRatingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF5F2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    feedRatingText: {
        fontSize: 12,
        color: '#E86A33',
        fontWeight: '700',
    },
    feedImage: {
        width: '100%',
        height: 200,
    },
    feedImagePlaceholder: {
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedNotesContainer: {
        padding: 16,
        backgroundColor: '#FBFBFB',
    },
    feedNotesText: {
        fontSize: 13,
        color: '#555',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    emptyJournalContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        backgroundColor: '#FFF',
        borderRadius: 24,
    },
    emptyText: {
        textAlign: 'center',
        color: '#AAA',
        fontSize: 14,
        marginTop: 15,
        fontStyle: 'italic',
    },
});
