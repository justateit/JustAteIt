import { DiningFrequencyCard, TasteDNACard } from '@/components/ProfileCards';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const journalData = [
    {
        id: '1',
        month: 'OCT',
        day: '11',
        title: 'Smoked Eel ...',
        subtitle: 'SEPTIME - PARIS',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=200&q=80',
    },
    {
        id: '2',
        month: 'NOV',
        day: '30',
        title: 'Uni & Truffle ...',
        subtitle: 'ATOMIX - NEW YORK',
        rating: '5',
        image: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=200&q=80',
    },
    {
        id: '3',
        month: 'JAN',
        day: '14',
        title: 'Charred Octo ...',
        subtitle: 'PUJOL - MEXICO C ...',
        rating: '4.0',
        image: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=200&q=80',
    },
    {
        id: '4',
        month: 'FEB',
        day: '9',
        title: 'Tonkotsu Ra...',
        subtitle: 'ICHIRAN - TOKYO',
        rating: '4.7',
        image: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=200&q=80',
    },
];

export default function App() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity>
                        <Text style={styles.headerText}>View Saved Drafts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Feather name="settings" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=400&q=80' }}
                            style={styles.avatar}
                        />
                        <View style={styles.editBadge}>
                            <Feather name="edit-2" size={12} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.name}>Julienne Bruno</Text>
                    <Text style={styles.handle}>@julienne</Text>

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
                                <Text style={styles.statNumber}>4</Text>
                                <Text style={styles.statLabel}>DISHES</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>1204</Text>
                                <Text style={styles.statLabel}>FOLLOWERS</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>89</Text>
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

                <View style={styles.journalListContainer}>
                    {journalData.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.journalItem,
                                index === journalData.length - 1 && styles.lastJournalItem
                            ]}
                        >
                            <View style={styles.dateContainer}>
                                <Text style={styles.monthText}>{item.month}</Text>
                                <Text style={styles.dayText}>{item.day}</Text>
                            </View>

                            <Image source={{ uri: item.image }} style={styles.journalImage} />

                            <View style={styles.journalTextContainer}>
                                <Text style={styles.journalItemTitle}>{item.title}</Text>
                                <Text style={styles.journalItemSubtitle}>{item.subtitle}</Text>
                            </View>

                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingText}>{item.rating}</Text>
                                <FontAwesome name="star" size={14} color="#C4C4C4" />
                            </View>
                        </View>
                    ))}
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
    journalListContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    journalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    lastJournalItem: {
        borderBottomWidth: 0,
    },
    dateContainer: {
        alignItems: 'center',
        width: 40,
        marginRight: 12,
    },
    monthText: {
        fontSize: 12,
        color: '#A0A0A0',
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 2,
    },
    dayText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
    },
    journalImage: {
        width: 44,
        height: 44,
        borderRadius: 6,
        marginRight: 16,
    },
    journalTextContainer: {
        flex: 1,
    },
    journalItemTitle: {
        fontFamily: serifFont,
        fontSize: 16,
        color: '#000',
        marginBottom: 4,
    },
    journalItemSubtitle: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        letterSpacing: 1,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
});