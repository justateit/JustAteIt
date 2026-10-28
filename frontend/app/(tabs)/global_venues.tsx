import TopRatedSpotsCard from '@/components/TopRatedSpotsCard';
import VenueCard from '@/components/VenueCard';
import { topRatedSpots } from '@/data/mockdata';
import { getTopCities } from '@/utils/flavorProfileApi';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';

interface Props {
    onPress: () => void;
}
const GlobalVenues = ({ onPress }: Props) => {
    const { colorScheme } = useTheme();

    const { data, isLoading } = useQuery({
        queryKey: ['topCities'],
        queryFn: () => getTopCities(10),
    });
    const topCities = data?.cities ?? [];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                minHeight: "100%",
                paddingBottom: 10
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 90, marginBottom: 25 }}>
                <TouchableOpacity
                    onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color={Colors[colorScheme].icon} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Global Venues</Text>
            </View>
            {isLoading ? (
                <ActivityIndicator style={{ marginVertical: 24 }} />
            ) : topCities.length === 0 ? (
                <Text style={{ color: Colors[colorScheme].icon, marginBottom: 12 }}>No venues logged anywhere yet.</Text>
            ) : (
                <FlatList
                    data={topCities}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => <VenueCard {...item} />}
                    scrollEnabled={false}
                    contentContainerStyle={{ gap: 12 }}
                />
            )}
            <Text style={{ fontFamily: "LibreBaskerville", fontSize: 20, color: Colors[colorScheme].text, marginTop: 30, marginBottom: 20 }}>Top Rated Spots</Text>
            <TopRatedSpotsCard
                spots={topRatedSpots}
            />
            {/* Bottom padding for scrollability */}
            <View style={{ height: 100 }} />
        </ScrollView>
    )
}
export default GlobalVenues
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F0E6",
        padding: 20,
    },
    title: {
        fontFamily: "LibreBaskerville",
        fontSize: 35,
        letterSpacing: -1
    },
})
