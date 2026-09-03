import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { deleteLog, updateLog } from '../utils/flavorProfileApi';

const { width } = Dimensions.get('window');

function formatDateDisplay(d?: string) {
    if (!d) return '';
    try {
        if (d.includes('T')) {
            const dateObj = new Date(d);
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
        return d;
    } catch {
        return d;
    }
}

const HorizontalDishCard = ({
    id,
    title,
    restaurant,
    date,
    rating,
    image,
    location,
    tastingNotes,
    chemistryInsight,
    tags,
    onUpdated,
    onDeleted,
}: Dish) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Live display state
    const [currentTitle, setCurrentTitle] = useState(title);
    const [currentRestaurant, setCurrentRestaurant] = useState(restaurant);
    const [currentRating, setCurrentRating] = useState(rating);
    const [currentNotes, setCurrentNotes] = useState(tastingNotes);

    // Edit form state
    const [editTitle, setEditTitle] = useState(title);
    const [editRestaurant, setEditRestaurant] = useState(restaurant);
    const [editRating, setEditRating] = useState(rating);
    const [editNotes, setEditNotes] = useState(tastingNotes);

    useEffect(() => {
        setCurrentTitle(title);
        setCurrentRestaurant(restaurant);
        setCurrentRating(rating);
        setCurrentNotes(tastingNotes);
    }, [title, restaurant, rating, tastingNotes]);

    const openEditMode = () => {
        setEditTitle(currentTitle);
        setEditRestaurant(currentRestaurant);
        setEditRating(currentRating);
        setEditNotes(currentNotes);
        setIsEditing(true);
    };

    const cancelEditMode = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!editTitle.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Dish name cannot be empty');
            } else {
                Alert.alert('Validation', 'Dish name cannot be empty.');
            }
            return;
        }

        setIsSaving(true);
        try {
            await updateLog(id, {
                dish_name: editTitle.trim(),
                venue_name: editRestaurant.trim() || undefined,
                rating: Number(editRating) || 5,
                sensory_notes: editNotes.trim() || undefined,
            });

            setCurrentTitle(editTitle.trim());
            setCurrentRestaurant(editRestaurant.trim());
            setCurrentRating(Number(editRating) || 5);
            setCurrentNotes(editNotes.trim());
            setIsEditing(false);
            onUpdated?.();
        } catch (err: any) {
            const msg = err.message || 'Failed to update entry';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Update Failed', msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        const confirmMsg = `Delete "${currentTitle}" from your food journal?`;
        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                doDelete();
            }
        } else {
            Alert.alert(
                'Delete Entry',
                confirmMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: doDelete },
                ]
            );
        }
    };

    const doDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteLog(id);
            setModalVisible(false);
            onDeleted?.();
        } catch (err: any) {
            const msg = err.message || 'Failed to delete entry';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Delete Failed', msg);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const formattedDate = formatDateDisplay(date);

    return (
        <>
            <TouchableOpacity
                style={styles.cardTouchWrapper}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
            >
                <View style={styles.cardContainer}>
                    <Image
                        source={typeof image === 'string' ? { uri: image } : image}
                        style={styles.cardImage}
                        contentFit="cover"
                        transition={200}
                    />
                    {/* Dark Overlay for text legibility */}
                    <View style={styles.cardOverlay} />

                    {/* Rating Badge */}
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{Number(currentRating).toFixed(1)}</Text>
                        <Ionicons name="star" size={12} color="#FFFFFF" />
                    </View>

                    {/* Bottom details on card */}
                    <View style={styles.cardBottom}>
                        <Text style={styles.dishName} numberOfLines={2}>
                            {currentTitle}
                        </Text>
                        <View style={styles.sectionHeader}>
                            {currentRestaurant ? (
                                <>
                                    <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                                    <Text style={[styles.dishDetails, { maxWidth: '55%' }]} numberOfLines={1}>
                                        {currentRestaurant}
                                    </Text>
                                    <Text style={styles.dishDetailsDot}>•</Text>
                                </>
                            ) : null}
                            {formattedDate ? (
                                <>
                                    <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                                    <Text style={styles.dishDetails} numberOfLines={1}>
                                        {formattedDate}
                                    </Text>
                                </>
                            ) : null}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (isEditing) cancelEditMode();
                    else setModalVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header Cover Image */}
                        <View style={styles.modalImageContainer}>
                            <Image
                                source={typeof image === 'string' ? { uri: image } : image}
                                style={styles.modalImage}
                                contentFit="cover"
                                transition={200}
                            />
                            <View style={styles.modalImageOverlay} />

                            {/* Top Left: Close Button */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (isEditing) cancelEditMode();
                                    else setModalVisible(false);
                                }}
                                style={styles.closeBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={20} color="#FFFFFF" />
                            </TouchableOpacity>

                            {/* Top Right Actions */}
                            <View style={styles.topActionsRow}>
                                {!isEditing ? (
                                    <>
                                        <TouchableOpacity
                                            style={styles.editBadge}
                                            onPress={openEditMode}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="pencil" size={13} color="#FFFFFF" />
                                            <Text style={styles.badgeActionText}>EDIT</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteBadge}
                                            onPress={handleDelete}
                                            disabled={isDeleting}
                                            activeOpacity={0.8}
                                        >
                                            {isDeleting ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="trash-outline" size={13} color="#FFFFFF" />
                                                    <Text style={styles.badgeActionText}>DELETE</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={styles.cancelBadge}
                                            onPress={cancelEditMode}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.cancelBadgeText}>CANCEL</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.saveBadge}
                                            onPress={handleSave}
                                            disabled={isSaving}
                                            activeOpacity={0.8}
                                        >
                                            {isSaving ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.saveBadgeText}>SAVE</Text>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {/* Header Dish & Venue info (view mode) */}
                            {!isEditing && (
                                <View style={styles.modalHeaderBottom}>
                                    <Text style={styles.modalDishTitle} numberOfLines={2}>
                                        {currentTitle}
                                    </Text>
                                    <View style={styles.sectionHeader}>
                                        {currentRestaurant ? (
                                            <>
                                                <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                                                <Text style={[styles.dishDetails, { maxWidth: '55%' }]} numberOfLines={1}>
                                                    {currentRestaurant}
                                                </Text>
                                                <Text style={styles.dishDetailsDot}>•</Text>
                                            </>
                                        ) : null}
                                        {formattedDate ? (
                                            <>
                                                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                                                <Text style={styles.dishDetails} numberOfLines={1}>
                                                    {formattedDate}
                                                </Text>
                                            </>
                                        ) : null}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Modal Body / Information or Edit Form */}
                        <ScrollView
                            style={styles.modalScroll}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {isEditing ? (
                                /* EDIT FORM */
                                <View style={styles.editForm}>
                                    <Text style={styles.editFormHeading}>EDIT FOOD MEMORY</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>DISH NAME</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editTitle}
                                            onChangeText={setEditTitle}
                                            placeholder="What did you eat?"
                                            placeholderTextColor="#999"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>VENUE / RESTAURANT</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editRestaurant}
                                            onChangeText={setEditRestaurant}
                                            placeholder="Restaurant or home-cooked"
                                            placeholderTextColor="#999"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>RATING</Text>
                                        <View style={styles.starRow}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <TouchableOpacity
                                                    key={star}
                                                    onPress={() => setEditRating(star)}
                                                    style={styles.starTouch}
                                                >
                                                    <Ionicons
                                                        name={editRating >= star ? 'star' : 'star-outline'}
                                                        size={28}
                                                        color={editRating >= star ? '#FF6B4A' : '#BBB'}
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                            <Text style={styles.starScoreText}>
                                                {Number(editRating).toFixed(1)} / 5.0
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>TASTING & SENSORY NOTES</Text>
                                        <TextInput
                                            style={[styles.textInput, styles.textAreaInput]}
                                            value={editNotes}
                                            onChangeText={setEditNotes}
                                            placeholder="Describe the flavor, texture, acid, spice..."
                                            placeholderTextColor="#999"
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    <View style={styles.formActionButtons}>
                                        <TouchableOpacity
                                            style={styles.formCancelBtn}
                                            onPress={cancelEditMode}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.formCancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.formSaveBtn}
                                            onPress={handleSave}
                                            disabled={isSaving}
                                            activeOpacity={0.8}
                                        >
                                            {isSaving ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={styles.formSaveBtnText}>Save Changes</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                /* VIEW DETAILS */
                                <>
                                    {/* Reviewer Score Header */}
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreLabel}>REVIEWER SCORE</Text>
                                        <View style={styles.scoreActionButtons}>
                                            <TouchableOpacity
                                                style={styles.actionPill}
                                                onPress={openEditMode}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#444" />
                                                <Text style={styles.actionPillText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionPill, styles.deletePill]}
                                                onPress={handleDelete}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#D9381E" />
                                                <Text style={[styles.actionPillText, styles.deletePillText]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Big Rating */}
                                    <View style={styles.ratingNumberRow}>
                                        <Text style={styles.ratingBigNumber}>
                                            {Number(currentRating).toFixed(1)}
                                        </Text>
                                        <Text style={styles.ratingSlash}>/</Text>
                                        <Text style={styles.ratingMax}>5.0</Text>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Tasting Notes */}
                                    <Text style={styles.sectionLabel}>TASTING NOTES</Text>
                                    <Text style={styles.notesQuote}>
                                        &quot;{currentNotes || 'No sensory notes recorded.'}&quot;
                                    </Text>

                                    {/* Sensory Profile Pill */}
                                    <View style={styles.sensoryCard}>
                                        <View style={styles.sensoryIndicator}>
                                            <View style={styles.sensoryDot} />
                                            <Text style={styles.sensoryLabel}>SENSORY PROFILE</Text>
                                        </View>
                                    </View>

                                    {/* Chemistry Insight (if exists) */}
                                    {chemistryInsight ? (
                                        <>
                                            <Text style={styles.chemistryLabel}>CHEMISTRY INSIGHT</Text>
                                            <View style={styles.chemistryCard}>
                                                <Text style={styles.chemistryText}>{chemistryInsight}</Text>
                                            </View>
                                        </>
                                    ) : null}

                                    {/* Tags */}
                                    {tags && tags.length > 0 ? (
                                        <>
                                            <View style={styles.divider} />
                                            <View style={styles.tagsContainer}>
                                                {tags.map((tag) => (
                                                    <View key={tag} style={styles.tagBox}>
                                                        <Text style={styles.tagText}>#{tag}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    ) : null}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default HorizontalDishCard;

const styles = StyleSheet.create({
    cardTouchWrapper: {
        width: '100%',
    },
    cardContainer: {
        width: '100%',
        height: 220,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        backgroundColor: '#EAE5DB',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.32)',
    },
    ratingBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cardBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    dishName: {
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        fontSize: 22,
        color: '#FFFFFF',
        fontWeight: '700',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dishDetails: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    dishDetailsDot: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginHorizontal: 2,
    },

    /* MODAL STYLES */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F7F4EC',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '90%',
        overflow: 'hidden',
    },
    modalImageContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
        backgroundColor: '#222',
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    modalImageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    closeBtn: {
        position: 'absolute',
        top: 14,
        left: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    topActionsRow: {
        position: 'absolute',
        top: 14,
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
    },
    editBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    deleteBadge: {
        backgroundColor: 'rgba(217, 56, 30, 0.75)',
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cancelBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    cancelBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#222',
        letterSpacing: 0.8,
    },
    saveBadge: {
        backgroundColor: '#FF6B4A',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 7,
        shadowColor: '#FF6B4A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
    saveBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    badgeActionText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    modalHeaderBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 18,
    },
    modalDishTitle: {
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '700',
        marginBottom: 4,
    },

    /* SCROLL CONTENT */
    modalScroll: {
        paddingHorizontal: 20,
    },
    modalScrollContent: {
        paddingTop: 18,
        paddingBottom: 40,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    scoreLabel: {
        letterSpacing: 1.5,
        fontSize: 11,
        fontWeight: '700',
        color: '#888',
    },
    scoreActionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: '#EAE5DB',
    },
    actionPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    deletePill: {
        backgroundColor: '#FDEEEB',
    },
    deletePillText: {
        color: '#D9381E',
    },
    ratingNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    ratingBigNumber: {
        fontSize: 54,
        fontWeight: '700',
        color: '#FF6B4A',
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        letterSpacing: 1,
    },
    ratingSlash: {
        fontSize: 22,
        color: '#999',
        marginLeft: 4,
    },
    ratingMax: {
        fontSize: 22,
        color: '#999',
        marginLeft: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        marginVertical: 16,
    },
    sectionLabel: {
        letterSpacing: 1.5,
        fontSize: 11,
        fontWeight: '700',
        color: '#888',
        marginBottom: 8,
    },
    notesQuote: {
        fontSize: 14,
        lineHeight: 22,
        color: '#222',
        fontStyle: 'italic',
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        marginBottom: 16,
    },
    sensoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    sensoryIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sensoryDot: {
        backgroundColor: '#FF6B4A',
        borderRadius: 4,
        width: 8,
        height: 8,
    },
    sensoryLabel: {
        letterSpacing: 1.5,
        fontSize: 11,
        fontWeight: '700',
        color: '#777',
    },
    chemistryLabel: {
        letterSpacing: 1.5,
        fontSize: 11,
        fontWeight: '700',
        color: '#FF6B4A',
        marginBottom: 8,
    },
    chemistryCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderLeftColor: '#FF6B4A',
        borderLeftWidth: 4,
        borderRadius: 8,
        marginBottom: 16,
    },
    chemistryText: {
        fontSize: 13,
        color: '#333',
        lineHeight: 19,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagBox: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.06)',
    },
    tagText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },

    /* EDIT FORM STYLES */
    editForm: {
        paddingVertical: 4,
    },
    editFormHeading: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#FF6B4A',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#666',
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
    },
    textAreaInput: {
        minHeight: 90,
    },
    starRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    starTouch: {
        padding: 2,
    },
    starScoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF6B4A',
        marginLeft: 10,
    },
    formActionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    formCancelBtn: {
        flex: 1,
        backgroundColor: '#EAE5DB',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
    },
    formCancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#555',
    },
    formSaveBtn: {
        flex: 1,
        backgroundColor: '#FF6B4A',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        shadowColor: '#FF6B4A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
    },
    formSaveBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
