import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';
import { getVenuesInCity } from '@/utils/flavorProfileApi';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface Venue {
    name: string;
    city: string;
    avgRating: number | null;
    reviewsLogged: number;
}

export default function CityPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colorScheme } = useTheme();
    const cityName = id ? decodeURIComponent(id) : undefined;

    const { data, isLoading } = useQuery<Venue[]>({
        queryKey: ['venuesInCity', cityName],
        queryFn: () => getVenuesInCity(cityName!).then((d) => d.venues ?? []),
        enabled: !!cityName,
    });
    const venues = data ?? [];

    return (
        <ScrollView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
            <View>
                {/* Generic placeholder — real cities have no curated photo.
                    Same treatment as VenueCard on the Global Venues list. */}
                <LinearGradient colors={['#6B5B4A', '#2E2622']} style={{ width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="earth-outline" size={44} color="rgba(255,255,255,0.35)" />
                </LinearGradient>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, padding: 6 }}
                >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={{ position: 'absolute', bottom: 16, left: 16, fontFamily: 'LibreBaskerville', fontSize: 30, fontWeight: '900', color: '#FFFFFF' }}>
                    {cityName}
                </Text>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 16, marginBottom: 40 }} />
            ) : venues.length === 0 ? (
                <Text style={{ padding: 16, color: Colors[colorScheme].icon }}>No venues logged in this city yet.</Text>
            ) : (
                venues.map((v: Venue, i: number) => (
                    <View
                        key={v.name}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: Colors[colorScheme].card,
                            borderRadius: 14,
                            padding: 14,
                            marginHorizontal: 16,
                            marginTop: i === 0 ? 20 : 0,
                            marginBottom: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: colorScheme === 'dark' ? 0 : 0.06,
                            shadowRadius: 6,
                            elevation: 2,
                        }}
                    >
                        <View style={{
                            width: 44, height: 44, borderRadius: 22, marginRight: 12,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: colorScheme === 'dark' ? 'rgba(255,107,74,0.18)' : 'rgba(255,107,74,0.12)',
                        }}>
                            <Ionicons name="restaurant-outline" size={20} color="#FF6B4A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'LibreBaskerville', fontWeight: '600', fontSize: 14, color: Colors[colorScheme].text }} numberOfLines={1}>
                                {v.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: Colors[colorScheme].icon, marginTop: 2 }} numberOfLines={1}>
                                {v.reviewsLogged} {v.reviewsLogged === 1 ? 'log' : 'logs'}
                            </Text>
                        </View>
                        {v.avgRating !== null && (
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', gap: 3,
                                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8,
                            }}>
                                <Ionicons name="star" size={11} color="#FF6B4A" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors[colorScheme].text }}>
                                    {v.avgRating.toFixed(1)}
                                </Text>
                            </View>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}
