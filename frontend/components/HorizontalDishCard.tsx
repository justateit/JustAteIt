import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const gap = width * 0.3
const HorizontalDishCard = ({ id, title, restaurant, date, rating, image, location, tastingNotes, chemistryInsight, tags }: Dish) => {
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <>
            <TouchableOpacity style={{ width: '100%' }} onPress={() => setModalVisible(true)}>
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
                        padding: 20,

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

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >

                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/*The image of the dish*/}
                        <View style={{ width: '100%', height: 220, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
                            <Image
                                source={typeof image === 'string' ? { uri: image } : image}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                transition={200}
                            />
                            <View style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            }} />
                            {/*Exit Circle*/}
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
                                <Ionicons name="close-circle" size={32} color="rgba(255, 255, 255, 0.63)" />
                            </TouchableOpacity>
                            {/*Save Button*/}
                            <TouchableOpacity style={styles.saveBadge}>

                                <Text style={styles.saveText}>SAVE</Text>

                            </TouchableOpacity>
                            {/* Dish name + restaurant + calendar */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
                                <Text style={styles.dishName} numberOfLines={2}>{title}</Text>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="location-outline" size={11} color="#FFFFFF" />
                                    <Text style={[styles.dishDetails, { maxWidth: '60%' }]} numberOfLines={1}>{restaurant}</Text>
                                    <Ionicons name="calendar-outline" size={11} color="#FFFFFF" />
                                    <Text style={styles.dishDetails} numberOfLines={1}>{date}</Text>
                                </View>
                            </View>
                        </View>
                        {/* Dish Information */}
                        <ScrollView
                            style={{ padding: 20 }}
                            contentContainerStyle={{ paddingBottom: 40 }} >
                            {/* Reviewer Score and share button */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: gap, marginHorizontal: 10, marginVertical: 10, }}>
                                <Text style={{ letterSpacing: 2, color: '#010101a4' }}>REVIEWER SCORE</Text>
                                <TouchableOpacity>
                                    {/* Number Circle */}
                                    <View style={styles.circle}>
                                        <Ionicons name="share-social-outline" size={20} color="#0101016c" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            {/* Rating */}
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ fontSize: 66, fontWeight: '700', color: '#FF6B4A', fontFamily: "LibreBaskerville-Bold", letterSpacing: 2, marginRight: 4 }}>{rating}</Text>
                                <Text style={{ fontSize: 22, color: '#737588', letterSpacing: 2 }}>/</Text>
                                <Text style={{ fontSize: 22, color: '#737588', letterSpacing: 2, marginLeft: 4 }}>5.0</Text>
                            </View>
                            <View style={styles.divider} />
                            {/* Tasting Notes */}
                            <Text style={{ letterSpacing: 2, color: '#010101a4', marginLeft: 10, paddingTop: 15 }}>TASTING NOTES</Text>
                            <Text style={{ color: 'black', padding: 15, lineHeight: 19, fontFamily: "LibreBaskerville" }}>"{tastingNotes}"</Text>
                            <View style={{ backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 }}>
                                <View style={{ flexDirection: 'row', gap: 8, margin: 10, alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#FF6B4A', borderRadius: 25, width: 8, height: 8 }} />
                                    <Text style={{ letterSpacing: 2, fontSize: 12, color: '#0101018d' }}>SENSORY PROFILE</Text>


                                </View>
                                <Text style={{ color: 'black' }}>

                                </Text>
                            </View>
                            {/* Chemistry Insight */}
                            <Text style={{ letterSpacing: 2, fontWeight: '700', color: '#FF6B4A', marginLeft: 10, paddingTop: 20, paddingBottom: 20 }}>CHEMISTRY INSIGHT</Text>
                            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 20, borderLeftColor: '#FF6B4A', borderLeftWidth: 4 }}>
                                <Text style={{ color: 'black' }}>
                                    {chemistryInsight}
                                </Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {tags.map((tag) => (
                                    <View key={tag} style={styles.tagBox}>
                                        <Text>#{tag}</Text>
                                    </View>
                                ))}
                            </View>


                        </ScrollView>

                    </View>
                </View >

            </Modal >

        </>
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
    saveBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#ff5f1fe5',
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
        minWidth: 60,
        minHeight: 32,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'white',
    },
    saveText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'white',
        letterSpacing: 1.5
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F4F0E6',
        borderRadius: 24,
        maxHeight: '85%',
        marginHorizontal: 16,
        marginBottom: 60,

    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: 'gray',
        borderWidth: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#01010150',
        marginVertical: 20,

    },
    tagBox: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderColor: 'gray',
        borderWidth: 0.2,
    }
})
