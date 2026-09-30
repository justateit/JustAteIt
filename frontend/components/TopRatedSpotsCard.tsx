import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';

interface Spot {
    id: string;
    name: string;
    location: string;
    loggedCount: number;
}

interface Props {
    spots: Spot[]
}

const TopRatedSpotsCard = ({ spots }: Props) => {
    const { colorScheme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
            {spots.map((spot, index) => (
                <View key={spot.id} style={{ marginBottom: 12 }}>
                    {/* Row: number circle | name and location | logged count */}
                    <View style={{ flexDirection: "row", alignItems: 'center' }}>
                        {/* Number Circle */}
                        <View style={[styles.circle, { backgroundColor: colorScheme === 'dark' ? '#333' : '#dddddfff' }]}>
                            <Text style={[styles.circleText, { color: Colors[colorScheme].text }]}>{index + 1}</Text>
                        </View>
                        {/* Name + Location */}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.restuarantName, { color: Colors[colorScheme].text }]}>{spot.name}</Text>
                            <Text style={[styles.location, { color: colorScheme === 'dark' ? '#AAA' : '#555' }]}>{spot.location}</Text>
                        </View>
                        {/* Venues Logged */}
                        <View style={{ flexDirection: "row", alignItems: 'center', gap: 3 }}>
                            <Text style={[styles.count, { color: '#FF5E1F', fontWeight: '900' }]}>{spot.loggedCount}</Text>
                            <Text style={[styles.count, { color: Colors[colorScheme].text }]}>LOGS</Text>
                        </View>
                    </View>
                    {/* Divider */}
                    {index < spots.length - 1 && <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]} />}
                </View>
            ))}
        </View>
    )
}
export default TopRatedSpotsCard
const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 14,
    },
    circle: {
        width: 32,
        height: 32,
        borderRadius: 25,
        backgroundColor: '#dddddfff',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',

    },
    circleText: {
        fontWeight: '600',
        fontSize: 13,
    },
    restuarantName: {
        fontWeight: '600',
        fontSize: 14,
        fontFamily: "LibreBaskerville",
        marginBottom: 5
    },
    location: {
        fontWeight: '300',
        fontSize: 8,

    },
    venuesLoggedText: {
        fontSize: 11,
        color: '#FF5E1F',
        fontWeight: '600',
        marginBottom: 10
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 12,
    },
    count: {
        fontSize: 11,
        fontWeight: '600',
    }
})
