import { userInsightsData } from '@/data/mockdata';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFlavorProfile, getLogs, getRecommendations } from '../../utils/flavorProfileApi';


interface Props {
    onPress: () => void;
}
const MyInsights = ({ onPress }: Props) => {

    const queryClient = useQueryClient();
    const { saves } = userInsightsData[0];
    const [modalVisible, setModalVisible] = useState(false);

    /* Animation when closing the AI insights modal */
    const slideDownAnim = useState(new Animated.Value(0))[0];
    const slideUpAnim = useState(new Animated.Value(0))[0];
    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) { // only allow dragging downward
                slideDownAnim.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 100) {
                // if dragged down more than 100px, close it
                closeModal();
            } else {
                // snap back to open position
                Animated.spring(slideDownAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            }
        },
    });

    const closeModal = () => {
        Animated.timing(slideDownAnim, {
            toValue: 500, // slides down 500 px
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setModalVisible(false);
            slideDownAnim.setValue(0); // reset again for next open
        });
    };

    const openModal = () => {
        slideUpAnim.setValue(500);
        setModalVisible(true);
        setShowBreakdown(false); // reset breakdown view when opening modal
        Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }
    // state to track which "Matched For You" card is selected
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [selectedDish, setSelectedDish] = useState<any | null>(null);
    const [dishModalVisible, setDishModalVisible] = useState(false);

    const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);

    const { user } = useUser();

    // Fetch recommendations, logs, and flavor profile data
    const { data: recsData } = useQuery({
        queryKey: ['recommendations', user?.id],
        queryFn: () => getRecommendations(user!.id),
        enabled: !!user?.id,
    });

    const { data: logsData } = useQuery({
        queryKey: ['logs', user?.id],
        queryFn: () => getLogs(user!.id).then((d: any) => d.logs ?? []),
        enabled: !!user?.id,
    });

    const { data: profileData } = useQuery({
        queryKey: ['flavorProfile', user?.id],
        queryFn: () => getFlavorProfile(user!.id),
        enabled: !!user?.id,
    });

    // Compute a user's level based on how many points they have
    const level = Math.floor((profileData?.points_count ?? 0) / 100) + 1;
    const currentPoints = (profileData?.points_count ?? 0) % 100;
    const pointsNeeded = 100;
    const getLevelLabel = (level: number) => {
        if (level == 5) return 'Culinary Connoisseur';
        if (level == 4) return 'Taste Architect';
        if (level == 3) return 'Palate Pioneer';
        if (level == 2) return 'Flavor Seeker';
        if (level == 1) return 'Fresh Bite';
        return 'Earn more points!';
    }

    const citiesVisited = new Set(
        (logsData ?? []).map((log: any) => log.city).filter(Boolean)
    ).size;

    const cuisineCounts: any = (logsData ?? []).reduce(
        (acc: any, log: any) => {
            if (log.cuisine) acc[log.cuisine] = (acc[log.cuisine] ?? 0) + 1;
            return acc;
        }, {} as any
    );

    const topCuisines = (Object.entries(cuisineCounts) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count }));

    const ratings = (logsData ?? []).reduce(
        (acc: any, log: any) => {
            if (log.rating === 5) acc.fiveStars++;
            else if (log.rating === 4) acc.fourStars++;
            else if (log.rating === 3) acc.threeStars++;
            else if (log.rating === 2) acc.twoStars++;
            else if (log.rating === 1) acc.oneStar++;
            return acc;
        },
        { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStar: 0 }
    );

    const totalRatings = ratings.fiveStars + ratings.fourStars + ratings.threeStars + ratings.twoStars + ratings.oneStar;
    const averageRating = totalRatings === 0 ? 0 : (
        (ratings.fiveStars * 5) +
        (ratings.fourStars * 4) +
        (ratings.threeStars * 3) +
        (ratings.twoStars * 2) +
        (ratings.oneStar * 1)
    ) / totalRatings;
    const getRatingColor = (avg: number) => {
        if (avg >= 4) return '#e24a08ff';
        if (avg >= 3) return '#ed7947ff';
        if (avg >= 2) return '#f99e78ff';
        if (avg >= 1) return '#f7c9b2ff';
        if (avg >= 0) return '#f4e4dcff';
        return '#fffcfbff';
    }
    const getCriticLabel = (avg: number) => {
        if (avg >= 4) return 'Enthusiast';
        if (avg >= 3) return 'Connoisseur';
        if (avg >= 2) return 'Tough Critic';
        if (avg >= 1) return 'Skeptic';
        if (avg >= 0.1) return 'Merciless';
        return 'New Foodie';
    }

    const PLACEHOLDER_IMAGE = require('../../assets/images/charred_octopus.jpg');

    const displayRecs = (recsData?.recommendations ?? []).map((rec: any, i: number) => ({

        id: `${rec.dish}-${rec.restaurant}-${i}`,
        title: rec.dish,
        restaurant: rec.restaurant,
        location: rec.city,
        image: PLACEHOLDER_IMAGE,
        match: rec.match,
        tags: rec.tags,
        tastingNotes: rec.reason,
        chemistryInsight: rec.chemistryInsight

    }))

    const [refreshingRecs, setRefreshingRecs] = useState(false);

    // Refresh suggestions
    const handleRefreshSuggestions = async () => {
        if (!user?.id || refreshingRecs) return;
        setRefreshingRecs(true);
        const previousDishes = displayRecs.map((r: any) => r.title);
        const fresh = await getRecommendations(user?.id, previousDishes);
        queryClient.setQueryData(['recommendations', user?.id], fresh);
        setRefreshingRecs(false);
        closeModal();
    }

    // Show breakdown of recommendations
    const [showBreakdown, setShowBreakdown] = useState(false);

    console.log(recsData);

    return (
        <>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        minHeight: "100%",
                        paddingBottom: 10
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 35, marginBottom: 25 }}>
                        <TouchableOpacity
                            onPress={() => {
                                router.push('/profile')
                            }}>
                            <Ionicons name="arrow-back" size={28} color="#918f8fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>My Insights</Text>
                    </View>

                    {/* Level Section */}
                    <View style={styles.levelContainer}>
                        <Text style={styles.currentLevelText}>CURRENT LEVEL</Text>
                        <Text style={styles.userLevelText}>{getLevelLabel(level)}</Text>
                        {/* Progress bar */}
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${(currentPoints / pointsNeeded) * 100}%` }]} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 10 }}>
                            <Text style={styles.pointsText}>{pointsNeeded - currentPoints} pts to {getLevelLabel(level + 1)}</Text>
                            <Text style={styles.levelNumberText}>Level {level}</Text>
                        </View>
                    </View>

                    {/* Logs, cities, and saves section */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 20 }}>
                        <View style={styles.squareContainer}>
                            <Text style={styles.squareText}>{logsData?.length ?? '--'}</Text>
                            <Text style={styles.itemText}>LOGS</Text>
                        </View>

                        <View style={styles.squareContainer}>
                            <Text style={styles.squareText}>{citiesVisited || '--'}</Text>
                            <Text style={styles.itemText}>CITIES</Text>
                        </View>

                        <View style={styles.squareContainer}>
                            <Text style={styles.squareText}>{saves}</Text>
                            <Text style={styles.itemText}>SAVES</Text>
                        </View>
                    </View>

                    {/* Top cuisines section */}
                    <View style={styles.topCuisineContainer}>
                        <Text style={styles.topCuisineTitle}>TOP CUISINES</Text>
                        <View style={{ flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 12 }}>

                            {topCuisines.map((cuisine) => (
                                <React.Fragment key={cuisine.name}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Text style={styles.cuisineText}>{cuisine.name}</Text>
                                        <Text style={styles.cuisineQuantityText}>{cuisine.count}</Text>
                                    </View>

                                    <View style={styles.cuisineProgressBarBackground}>
                                        <View style={[styles.cuisineProgressBarFill, { width: `${(cuisine.count / (logsData?.length || 1)) * 100}%` }]} />
                                    </View>
                                </React.Fragment>
                            ))}
                        </View>
                    </View>

                    {/* Rating breakdown section */}
                    <View style={styles.ratingBreakdownContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, }}>
                            <Text style={styles.ratingBreakdownTitle}>RATING BREAKDOWN</Text>
                            <View style={styles.criticBubble}>
                                <Text style={styles.criticBubbleText}>{getCriticLabel(averageRating)}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', gap: 40, marginLeft: 10 }}>
                                <View style={{ flexDirection: 'column', alignItems: 'center', marginTop: 5 }}>
                                    <View style={[styles.ratingCircle, { backgroundColor: getRatingColor(averageRating) }]}>
                                        <View style={styles.innerCircle}>
                                            <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
                                            <Text style={styles.averageRatingText}>avg</Text>

                                        </View>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 }}>
                                            <View style={styles.ratingColorBoxDark} />
                                            <Text style={styles.ratingText}>5 Stars</Text>
                                        </View>
                                        <Text style={styles.ratingPercentage}>{(Math.round((ratings.fiveStars / totalRatings) * 100)) || '0'}%</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 }}>
                                            <View style={styles.ratingColorBoxMed} />
                                            <Text style={styles.ratingText}>4 Stars</Text>
                                        </View>
                                        <Text style={styles.ratingPercentage}>{(Math.round((ratings.fourStars / totalRatings) * 100)) || '0'}%</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 }}>
                                            <View style={styles.ratingColorBoxLight} />
                                            <Text style={styles.ratingText}>3 Stars</Text>
                                        </View>
                                        <Text style={styles.ratingPercentage}>{(Math.round((ratings.threeStars / totalRatings) * 100)) || '0'}%</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 }}>
                                            <View style={styles.ratingColorBoxLighter} />
                                            <Text style={styles.ratingText}>2 Stars</Text>
                                        </View>
                                        <Text style={styles.ratingPercentage}>{(Math.round((ratings.twoStars / totalRatings) * 100)) || '0'}%</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 }}>
                                            <View style={styles.ratingColorBoxLightest} />
                                            <Text style={styles.ratingText}>1 Stars</Text>
                                        </View>
                                        <Text style={styles.ratingPercentage}>{(Math.round((ratings.oneStar / totalRatings) * 100)) || '0'}%</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>


                    {/* Matched For You AI Section */}
                    <View style={styles.matchedForYouContainer}>
                        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Ionicons name="flask" size={20} color="#E86A33" />
                                <Text style={styles.matchedForYouTitle}>MATCHED FOR YOU</Text>
                            </View>
                            <TouchableOpacity onPress={openModal} style={{ top: -5 }}>
                                <Ionicons name="ellipsis-horizontal" size={20} color="#757575ff" />
                            </TouchableOpacity>
                        </View>

                        {/*Conditionally show cards or disabled state*/}
                        {aiInsightsEnabled ? (
                            <>
                                <Text style={styles.matchedForYouText}>{recsData?.insight}</Text>


                                {/* Restaurant Suggestion Cards */}
                                <View style={{ flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                    {displayRecs.map((rec: any, index: number) => (
                                        <TouchableOpacity
                                            key={rec.id}
                                            style={{ width: '100%' }}
                                            onPress={() => {
                                                setSelectedCard(selectedCard === index ? null : index);
                                                setSelectedDish(rec);
                                                setDishModalVisible(true);
                                            }}
                                        >
                                            <View style={[styles.restaurantCard, selectedCard === index && styles.restaurantCardSelected]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    {/* Picture of Dish */}
                                                    <Image
                                                        source={rec.image}
                                                        style={styles.picture}
                                                    />
                                                    {/* Dish Information */}
                                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', flex: 1, gap: 4, minWidth: 0 }}>
                                                        <Text style={styles.dishName} numberOfLines={1} ellipsizeMode="tail">{rec.title}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                                            <Text style={[styles.restaurantName, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{rec.restaurant}</Text>
                                                            <Text style={styles.hyphen}>-</Text>
                                                            <Text style={[styles.restaurantCity, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{rec.location}</Text>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            {rec.tags.slice(0, 2).map((tag: string) => (
                                                                <View key={tag} style={styles.cuisineTypeBubble}>
                                                                    <Text style={styles.cuisineTypeText}>{tag}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                    <View style={{ alignItems: 'center', width: 50, flexShrink: 0 }}>
                                                        <Text style={styles.matchPercentageText}>{rec.match}%</Text>
                                                        <Text style={styles.matchText}>match</Text>
                                                    </View>
                                                </View>
                                            </View>

                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <Text style={styles.matchedForYouText}>Your taste profile is ready. Turn on AI insights to discover restaurants matched to your flavor DNA.</Text>
                        )}

                    </View >


                    {/* Bottom padding for scrollability */}
                    < View style={{ height: 100 }
                    } />

                </ScrollView >
            </SafeAreaView >

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideDownAnim }, { translateY: slideUpAnim }] }]}>

                        <View {...panResponder.panHandlers} style={{ alignItems: 'center', paddingVertical: 8 }}>
                            <View style={styles.dragHandle} />
                        </View>
                        <Text style={styles.manageText}>Manage recommendations</Text>
                        <View style={{ flexDirection: 'column', alignItems: 'center' }}>

                            {/* Refresh Suggestions */}
                            <TouchableOpacity style={{ width: '100%' }} onPress={handleRefreshSuggestions} disabled={refreshingRecs}>
                                <View style={styles.recommendationCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={styles.recommendationContainer}>
                                            {refreshingRecs ? (
                                                <ActivityIndicator size="small" color="#E86A33" />
                                            ) : (
                                                <Ionicons name="refresh" size={35} color="#E86A33" />
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 7, flex: 1, marginRight: 20 }}>
                                            <Text style={styles.recommendationText}>Refresh suggestions</Text>
                                            <Text style={styles.recommendationDescription}>Surface 3 new dishes for you</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Why these dishes */}
                            <TouchableOpacity style={{ width: '100%' }} onPress={() => setShowBreakdown(!showBreakdown)}>
                                <View style={styles.recommendationCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={styles.recommendationContainer}>
                                            <Ionicons name="information-circle-outline" size={35} color="#E86A33" />
                                        </View>
                                        <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 7, marginRight: 20, flex: 1 }}>
                                            <Text style={styles.recommendationText}>Why these dishes</Text>
                                            <Text style={styles.recommendationDescription}>See how your taste profile works</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {showBreakdown && (
                                <View style={{ width: '100%', backgroundColor: 'white', borderRadius: 16, padding: 20, marginTop: 8, borderLeftColor: '#E86A33', borderLeftWidth: 4 }}>
                                    <Text style={{ color: '#1a1a1a', lineHeight: 22 }}>
                                        {recsData?.breakdown ?? 'Analyzing your taste profile...'}
                                    </Text>
                                </View>
                            )}

                            {/* Turn off AI insights */}
                            <TouchableOpacity style=
                                {{ width: '100%' }}
                                onPress={() => {
                                    setAiInsightsEnabled(!aiInsightsEnabled);
                                    closeModal();
                                }}
                            >
                                <View style={styles.recommendationCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {aiInsightsEnabled ? (
                                            <>
                                                <View style={styles.turnOffAIContainer}>
                                                    <Ionicons name="eye-off-outline" size={35} color="#E86A33" />
                                                </View>
                                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 7, flex: 1, marginRight: 20 }}>
                                                    <Text style={styles.turnOffAIText}>Turn off AI insights</Text>
                                                    <Text style={styles.recommendationDescription}>Disable personalized recommendations</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.recommendationContainer}>
                                                    <Ionicons name="eye-outline" size={35} color="#E86A33" />
                                                </View>
                                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 7, flex: 1, marginRight: 20 }}>
                                                    <Text style={styles.recommendationText}>Turn on AI insights</Text>
                                                    <Text style={styles.recommendationDescription}>Enable personalized recommendations</Text>
                                                </View>
                                            </>
                                        )}
                                    </View>

                                </View>

                            </TouchableOpacity>
                        </View>


                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>

                        </View>

                    </Animated.View>
                </View >

            </Modal >
            {/* Dish Detail Modal */}
            {
                selectedDish && (
                    <Modal
                        visible={dishModalVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setDishModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.dishModalContent}>
                                {/* Image */}
                                <View style={{ width: '100%', height: 220, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
                                    <Image
                                        source={selectedDish.image}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} />
                                    <TouchableOpacity
                                        onPress={() => setDishModalVisible(false)}
                                        style={{ position: 'absolute', top: 10, left: 10 }}
                                    >
                                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.63)" />
                                    </TouchableOpacity>
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
                                        <Text style={styles.dishModalName}>{selectedDish.title}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="location-outline" size={11} color="#FFFFFF" />
                                            <Text style={{ fontSize: 10, color: 'white' }}>{selectedDish.restaurant}</Text>
                                        </View>
                                    </View>
                                </View>
                                {/* Details */}
                                <ScrollView style={{ padding: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <Text style={{ fontSize: 10, letterSpacing: 2, color: '#010101a4', marginBottom: 8 }}>REVIEWER SCORE</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 }}>
                                        <Text style={{ fontSize: 66, fontWeight: '700', color: '#FF6B4A', letterSpacing: 2, marginRight: 4 }}>{selectedDish.match}</Text>
                                        <Text style={{ fontSize: 22, color: '#737588' }}>%</Text>
                                    </View>
                                    <Text style={{ fontSize: 10, letterSpacing: 2, color: '#010101a4', marginBottom: 8 }}>TASTING NOTES</Text>
                                    <Text style={{ color: 'black', lineHeight: 19, marginBottom: 20, fontStyle: 'italic' }}>&quot;{selectedDish.tastingNotes}&quot;</Text>
                                    <Text style={{ fontSize: 10, letterSpacing: 2, color: '#FF6B4A', fontWeight: '700', marginBottom: 12 }}>CHEMISTRY INSIGHT</Text>
                                    <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 20, borderLeftColor: '#FF6B4A', borderLeftWidth: 4, marginBottom: 20 }}>
                                        <Text style={{ color: 'black' }}>{selectedDish.chemistryInsight}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                        {selectedDish.tags.map((tag: string) => (
                                            <View key={tag} style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 10, borderColor: 'gray', borderWidth: 0.2 }}>
                                                <Text>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )
            }


        </>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F0E6',
    },
    container: {
        paddingHorizontal: 20,
    },
    title: {
        fontFamily: "LibreBaskerville",
        fontSize: 35,
        letterSpacing: -1
    },
    levelContainer: {
        backgroundColor: '#E86A33',
        borderRadius: 16,
        padding: 20,
    },
    currentLevelText: {
        fontSize: 10,
        color: '#FFFFFF',
    },
    userLevelText: {
        fontSize: 19,
        color: '#FFFFFF',
        fontWeight: 500,
        marginTop: 8,
        marginBottom: 9
    },
    pointsText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: 500,

    },
    levelNumberText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: 700,

    },
    squareContainer: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18
    },
    squareText: {
        fontWeight: 600,
        letterSpacing: 1,
        fontSize: 25,
        paddingTop: 7,
        paddingBottom: 6,
        color: '#2d2d2dff',
    },
    itemText: {
        fontSize: 14,
        paddingBottom: 7,
        color: '#757575ff',
        fontWeight: 400
    },
    topCuisineContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,

    },
    topCuisineTitle: {
        color: '#757575ff',
        fontWeight: 600,
        fontSize: 15
    },
    cuisineText: {
        flex: 1,
        fontWeight: 600,
        fontSize: 12
    },
    cuisineQuantityText: {
        fontSize: 12
    },
    ratingBreakdownContainer: {
        backgroundColor: 'white',
        marginTop: 20,
        padding: 20,
        borderRadius: 16,

    },
    ratingBreakdownTitle: {
        color: '#757575ff',
        fontWeight: 600,
        fontSize: 15
    },
    criticBubble: {
        backgroundColor: '#fee2d7ff',
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 18,

    },
    criticBubbleText: {
        color: '#ff7b4bff',
        fontWeight: 600,
        fontSize: 15
    },
    matchedForYouContainer: {
        backgroundColor: 'black',
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
    },
    matchedForYouTitle: {
        color: '#848484ff',
        fontWeight: 600,
        fontSize: 15,
    },
    matchedForYouText: {
        color: 'white',
        fontStyle: 'italic',
        paddingRight: 30,
        paddingBottom: 10,
        paddingTop: 10,
        lineHeight: 24,
        fontWeight: 500,
    },
    picture: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#333',
        flexShrink: 0,
    },
    restaurantCard: {
        width: '100%',
        backgroundColor: '#3f3f3f87',
        borderRadius: 10,
        padding: 12,
    },
    restaurantCardSelected: {
        width: '100%',
        backgroundColor: '#3f3f3f87',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E86A33',
    },
    dishName: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    restaurantName: {
        color: '#888',
        fontSize: 11,
    },
    hyphen: {
        color: '#888',
        fontSize: 11,
    },
    restaurantCity: {
        color: '#888',
        fontSize: 11,
    },
    cuisineTypeBubble: {
        backgroundColor: '#E86A33',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,

    },
    cuisineTypeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '500',
    },
    flavorBubble: {
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 0.5,
        borderColor: '#444',
    },
    flavorText: {
        color: '#aaa',
        fontSize: 10,

    },
    matchPercentageText: {
        color: '#E86A33',
        fontWeight: '700',
        fontSize: 14,
    },
    matchText: {
        color: '#666',
        fontSize: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F4F0E6',
        //maxHeight: '50%',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 70,
        paddingTop: 0,
    },
    manageText: {
        color: '#000000ff',
        fontWeight: 700,
        fontSize: 23,
        marginTop: 4,
        marginBottom: 10,
    },
    recommendationCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 25,
        marginTop: 13,
        borderWidth: 0.18,
        borderColor: '#848484ff',
        paddingRight: 20,
    },
    recommendationContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffa78678',
        borderRadius: 8,
        width: 50,
        height: 50,
    },
    recommendationText: {
        color: '#000000ff',
        fontWeight: 600,
        fontSize: 20,
        flexWrap: 'wrap'

    },
    recommendationDescription: {
        color: '#848484ff',
        fontWeight: 600,
        fontSize: 14
    },
    turnOffAIContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff868678',
        borderRadius: 8,
        width: 50,
        height: 50,
    },
    turnOffAIText: {
        color: '#ff0000ff',
        fontWeight: 600,
        fontSize: 20,
        flexWrap: 'wrap'
    },
    dragHandle: {
        width: 80,
        height: 8,
        backgroundColor: '#ccc',
        borderRadius: 20,
        marginTop: 20,
        marginBottom: 10,
    },
    progressBarBackground: {
        backgroundColor: '#fcb39b87',
        borderRadius: 20,
        width: '100%',
        height: 10,
    },
    progressBarFill: {
        backgroundColor: '#FFFFFF',
        height: 10,
        borderRadius: 20,
    },
    cuisineProgressBarBackground: {
        backgroundColor: '#90823627',
        borderRadius: 20,
        width: '100%',
        height: 10,
        alignSelf: 'stretch',
    },
    cuisineProgressBarFill: {
        backgroundColor: '#ff8d5df0',
        height: 10,
        borderRadius: 20,
    },
    ratingCircle: {
        //backgroundColor: '#E86A33',
        padding: 12,
        borderRadius: 70,
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ratingColorBoxDark: {
        borderRadius: 8,
        width: 20,
        height: 20,
        backgroundColor: '#e24a08ff',
    },
    ratingColorBoxMed: {
        borderRadius: 8,
        width: 20,
        height: 20,
        backgroundColor: '#ed7947ff',
    },
    ratingColorBoxLight: {
        borderRadius: 8,
        width: 20,
        height: 20,
        backgroundColor: '#f99e78ff',
    },
    ratingColorBoxLighter: {
        borderRadius: 8,
        width: 20,
        height: 20,
        backgroundColor: '#f7c9b2ff',
    },
    ratingColorBoxLightest: {
        borderRadius: 8,
        width: 20,
        height: 20,
        backgroundColor: '#f4e4dcff',
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a'
    },
    ratingPercentage: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a'
    },
    innerCircle: {
        backgroundColor: '#ffffffff',
        padding: 12,
        borderRadius: 50,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    averageRating: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a'
    },
    averageRatingText: {
        fontWeight: 600,
        fontSize: 12,
        color: '#757575ff',
    },
    dishModalContent: {
        backgroundColor: '#F4F0E6',
        borderRadius: 24,
        maxHeight: '85%',
        marginHorizontal: 16,
        marginBottom: 60,
    },
    dishModalName: {
        fontFamily: 'LibreBaskerville',
        fontSize: 19,
        color: '#FFFFFF',
        fontWeight: '900',
        marginBottom: 6,
    }
})

export default MyInsights;
