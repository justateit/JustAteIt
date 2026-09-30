import HorizontalDishCard from '@/components/HorizontalDishCard';
import { SearchBar } from '@/components/SearchBar';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteSavedLog, getSavedLogs } from '../../utils/flavorProfileApi';

export default function HomeScreen() {
    const [fontsLoaded] = useFonts({
        'LibreBaskerville': require('@/assets/fonts/LibreBaskerville-VariableFont_wght.ttf'),
        'LibreBaskervilleItalic': require('@/assets/fonts/LibreBaskerville-Italic-VariableFont_wght.ttf'),
    });

    const [activeFilter, setActiveFilter] = useState('all');
    const [removingId, setRemovingId] = useState<string | null>(null);
    const { user } = useUser();
    const queryClient = useQueryClient();

    const { data: savedLogs, isLoading } = useQuery({
        queryKey: ['savedLogs', user?.id],
        queryFn: () => getSavedLogs(user!.id).then((d: any) => d.saved_logs ?? []),
        enabled: !!user?.id,
    });

    const handleRemove = async (savedLogId: string) => {
        if (removingId) return; // one at a time
        setRemovingId(savedLogId);
        try {
            await deleteSavedLog(savedLogId);
            queryClient.invalidateQueries({ queryKey: ['savedLogs', user?.id] });
        } catch (err) {
            console.error('[RemoveSavedLog]', err);
        } finally {
            setRemovingId(null);
        }
    };

    // Map the saved-log shape onto the props HorizontalDishCard expects.
    const cards = useMemo(() => (savedLogs ?? []).map((s: any) => ({
        id: s.id,
        title: s.dish_name || 'Untitled Dish',
        restaurant: s.venue_name || 'Unknown Place',
        date: s.created_at ? s.created_at.slice(0, 10) : '',
        rating: s.rating ?? 0,
        image: s.image_url || null,
        location: s.city || '',
        tastingNotes: s.notes || '',
        tags: s.tags ?? [],
    })), [savedLogs]);

    const visibleCards = useMemo(() => {
        if (activeFilter === 'recent') return cards.slice(0, 5);
        if (activeFilter === 'cuisine') {
            // Group by cuisine by sorting on the first tag, so dishes of the same
            // kind sit together rather than being filtered out.
            return [...cards].sort((a, b) => (a.tags[0] ?? '').localeCompare(b.tags[0] ?? ''));
        }
        return cards;
    }, [cards, activeFilter]);

    if (!fontsLoaded) return null;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                minHeight: "100%",
                paddingBottom: 10
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 90, marginBottom: 25 }}>
                <TouchableOpacity
                    onPress={() => {
                        router.push('/profile')
                    }}>
                    <Ionicons name="arrow-back" size={28} color="#918f8fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Saved Logs</Text>
            </View>
            <SearchBar
                value=""
                onChangeText={() => { }}
                placeholder="Search bookmarked dishes..."
                onPress={() => router.push('/search')}
            />
            {/* All, Recent, Cuisine */}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 20, marginBottom: 20, marginLeft: 5, marginRight: 5 }}>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('all')}>
                    <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'recent' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('recent')}>
                    <Text style={[styles.filterText, activeFilter === 'recent' && styles.filterTextActive]}>Recent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'cuisine' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('cuisine')}>
                    <Text style={[styles.filterText, activeFilter === 'cuisine' && styles.filterTextActive]}>Cuisine</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.stateBox}>
                    <ActivityIndicator size="small" color="#E86A33" />
                </View>
            ) : visibleCards.length === 0 ? (
                <View style={styles.stateBox}>
                    <Ionicons name="bookmark-outline" size={30} color="#c9c4b5" />
                    <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                    <Text style={styles.emptyText}>
                        Tap SAVE on any dish to keep it here for later.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={visibleCards}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.cardWrap}>
                            <HorizontalDishCard {...item} />
                            <TouchableOpacity
                                style={styles.removeBadge}
                                onPress={() => handleRemove(item.id)}
                                disabled={removingId === item.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${item.title} from saved`}
                            >
                                {removingId === item.id ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons name="bookmark" size={16} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                    scrollEnabled={false}
                    contentContainerStyle={{ gap: 12 }}
                />
            )}


            {/* Bottom padding for scrollability */}
            <View style={{ height: 100 }} />

        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F0E6",
        padding: 20,
    },
    title: {
        fontFamily: "LibreBaskerville",
        fontSize: 38,
        letterSpacing: -1
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 20,
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    filterButton: {
        backgroundColor: '#ffffffff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 100,
        maxHeight: 35,
        marginLeft: 1,
        marginRight: 1,
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 0.5,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 1,
    },
    filterButtonActive: {
        backgroundColor: '#E86A33',
        borderColor: '#E86A33',
    },
    filterTextActive: {
        color: '#fff',
    },
    stateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 56,
    },
    emptyTitle: {
        fontFamily: 'LibreBaskerville',
        fontSize: 17,
        color: '#6b6759',
    },
    emptyText: {
        fontSize: 13,
        color: '#9a9482',
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 18,
    },
    cardWrap: {
        position: 'relative',
    },
    removeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    }
});