import TopRatedSpotsCard from '@/components/TopRatedSpotsCard';
import VenueCard from '@/components/VenueCard';
import { exploreCities, topRatedSpots } from '@/data/mockdata';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    onPress: () => void;
}
const GlobalVenues = ({ onPress }: Props) => {
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
                    onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="#918f8fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Global Venues</Text>
            </View>
            <FlatList
                data={exploreCities}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <VenueCard {...item} />}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
            />
            <Text style={{ fontFamily: "LibreBaskerville", fontSize: 20, color: 'black', marginTop: 30, marginBottom: 20 }}>Top Rated Spots</Text>
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
