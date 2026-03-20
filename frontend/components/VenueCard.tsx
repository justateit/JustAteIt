import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface City {
    id: string;
    name: string;
    image: any;
    venuesLogged: number;
}
const VenueCard = ({ id, name, image, venuesLogged }: City) => {
    return (
        <Link href={`/city/${id}`} asChild>
            <TouchableOpacity style={{ width: '100%', marginRight: 12 }}>
                <View style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 5 }}>
                    <Image
                        source={typeof image === 'string' ? { uri: image } : image}
                        style={{ width: '100%', height: 220 }}
                        contentFit="cover"
                        transition={200}
                    />
                    {/* Dark Overlay */}
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    }} />
                    <Text style={[styles.cityName, { position: 'absolute', bottom: 28, left: 15 }]} numberOfLines={2}>
                        {name}
                    </Text>
                    <View style={[styles.sectionHeader, { position: 'absolute', bottom: 20, left: 20 }]}>
                        <Text style={[styles.venuesLogged, { maxWidth: '100%' }]} numberOfLines={1}>
                            {venuesLogged} VENUES LOGGED
                        </Text>

                    </View>
                </View>

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
    venuesLogged: {
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
