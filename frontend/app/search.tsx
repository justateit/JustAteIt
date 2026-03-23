import HorizontalDishCard from '@/components/HorizontalDishCard';
import SearchBar from '@/components/SearchBar';
import { trendingDishes } from '@/data/mockdata';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



const Search = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const results = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return trendingDishes.filter(dish =>
            dish.title?.toLowerCase().includes(q) ||
            dish.restaurant?.toLowerCase().includes(q) ||
            dish.location?.toLowerCase().includes(q) ||
            dish.date?.includes(q));
    }, [searchQuery]);

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
            <Text style={{ fontSize: 13, color: 'black', marginBottom: 20, fontWeight: 'bold' }}>SEARCH RESULTS FOR '{searchQuery.toUpperCase()}'</Text>
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
                    {results.map((item) => (
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

