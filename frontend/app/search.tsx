import HorizontalDishCard from '@/components/HorizontalDishCard';
import SearchBar from '@/components/SearchBar';
import { trendingDishes } from '@/data/mockdata';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL; // if no API URL, use mock data


const Search = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading } = useQuery({

        queryKey: ['search', searchQuery],
        queryFn: () => {
            if (USE_MOCK) {
                return Promise.resolve(
                    trendingDishes.filter(dish =>
                        dish.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        dish.restaurant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        dish.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        dish.date?.includes(searchQuery))
                )
            }
            return fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/venues?search=${searchQuery}`)
                .then(r => r.json())
        },
        enabled: searchQuery.trim().length > 0, // only run query if there's a search term
    })
    const results = data ?? [];

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
                    onPress={() => router.replace('/(tabs)')}>
                    <Ionicons name="arrow-back" size={28} color="#918f8fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Discover</Text>
            </View>
            {searchQuery.trim() ? (
                <Text style={{ fontSize: 13, color: 'black', marginBottom: 20, fontWeight: 'bold' }}>
                    SEARCH RESULTS FOR '{searchQuery.toUpperCase()}'
                </Text>
            ) : null}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search dishes, cities, restaurants..."
            />
            {results.length === 0 ? (
                <Text style={{ color: '#737588', textAlign: 'center', marginTop: 20 }}>
                    {searchQuery.trim() ? 'No results found' : 'Search for a dish or city'}
                </Text>
            ) : (
                <View style={{ gap: 20, marginTop: 10 }}>
                    {results.map((item: any) => (
                        <HorizontalDishCard key={item.id} {...item} />
                    ))}
                </View>
            )}

        </ScrollView>
    );
};


export default Search
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F0E6",
        padding: 20,
    },
    title: {
        fontFamily: "LibreBaskerville",
        fontSize: 45,
        letterSpacing: -1
    },
})

