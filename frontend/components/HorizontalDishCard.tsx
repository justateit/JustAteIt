import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const HorizontalDishCard = ({ id, title, restaurant, date, rating, image, location }: Dish) => {
    return (
        <Link href={`/dish/${id}`} asChild>
            <TouchableOpacity style={{ width: '100%' }}>
                <View style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden' }}>
                    <Image
                        source={typeof image === 'string' ? { uri: image } : image}
                        style={{ width: '100%', height: '100%' }}
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
                    {/*Rating Badge */}
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{rating}</Text>
                        <Ionicons name="star" size={13} color="#FFFFFF" />
                    </View>
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 10,

                    }}>
                        <Text style={styles.dishName} numberOfLines={2}>
                            {title}
                        </Text>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location-outline" size={11} color="#FFFFFF" />
                            <Text style={[styles.dishDetails, { maxWidth: '60%' }]} numberOfLines={1}>
                                {restaurant} |
                            </Text>
                            <Ionicons name="calendar-outline" size={11} color="#FFFFFF" />
                            <Text style={styles.dishDetails} numberOfLines={1}>
                                {date}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>


        </Link>
    )
}


export default HorizontalDishCard
const styles = StyleSheet.create({
    dishName: {
        fontFamily: "LibreBaskerville",
        fontSize: 25,
        color: "#FFFFFF",
        fontWeight: '900',
        marginBottom: 5
    },
    dishDetails: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 5,
        justifyContent: 'center',
        minWidth: 52,
        minHeight: 32,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'white',
    },
})
