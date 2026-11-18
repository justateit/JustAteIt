import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface City {
    name: string;
    reviewsLogged: number;
}
// No per-city photos — real cities are derived from review data, so there's
// no curated image to show. Generic placeholder until there's design input.
const VenueCard = ({ name, reviewsLogged }: City) => {
    return (
        <Link href={`/city/${encodeURIComponent(name)}`} asChild>
            <TouchableOpacity style={{ width: '100%', marginRight: 12 }}>
                <LinearGradient
                    colors={['#6B5B4A', '#2E2622']}
                    style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 5, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Ionicons name="earth-outline" size={36} color="rgba(255,255,255,0.35)" />
                    <Text style={[styles.cityName, { position: 'absolute', bottom: 28, left: 15 }]} numberOfLines={2}>
                        {name}
                    </Text>
                    <View style={[styles.sectionHeader, { position: 'absolute', bottom: 20, left: 20 }]}>
                        <Text style={[styles.reviewsLogged, { maxWidth: '100%' }]} numberOfLines={1}>
                            {reviewsLogged} REVIEWS LOGGED
                        </Text>

                    </View>
                </LinearGradient>

            </TouchableOpacity>


        </Link >
    )
}


export default VenueCard
const styles = StyleSheet.create({
    cityName: {
        fontFamily: "LibreBaskerville",
        fontSize: 30,
        color: "#FFFFFF",
        fontWeight: '900',
        marginBottom: 10
    },
    reviewsLogged: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
})
