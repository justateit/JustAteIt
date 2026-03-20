import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


const DishCard = ({ id, title, restaurant, date, rating, image, location }: Dish) => {
    return (
        <Link href={`/dish/${id}`} asChild>
            <TouchableOpacity style={{ width: 190, marginRight: 9 }}>
                <View style={{ width: 190, height: 250, borderRadius: 12, overflow: 'hidden' }}>
                    <Image
                        source={typeof image === 'string' ? { uri: image } : image}
                        style={{ width: 190, height: 250, borderRadius: 12 }}
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
                    {/* Rating Badge */}
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{rating}</Text>
                        <Ionicons name="star" size={10} color="#FFFFFF" />
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
                            <Text style={[styles.dishDetails, { maxWidth: '40%' }]} numberOfLines={1}>
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


export default DishCard
const styles = StyleSheet.create({
    dishName: {
        fontFamily: "LibreBaskerville",
        fontSize: 19,
        color: "#FFFFFF",
        fontWeight: '900',
        marginBottom: 6
    },
    dishDetails: {
        fontSize: 10,
        color: "#FFFFFF",
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 0,
        marginBottom: 0,
    },
    ratingBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.56)',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 5,
        minWidth: 40,
        minHeight: 25,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'white',
    },
})

