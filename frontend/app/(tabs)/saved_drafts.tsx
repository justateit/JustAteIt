import { getDrafts } from '@/utils/flavorProfileApi';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';

const SavedDrafts = () => {
    const { user } = useUser();
    const { colorScheme } = useTheme();
    const { data, isLoading } = useQuery({
        queryKey: ['drafts', user?.id],
        queryFn: () => getDrafts(user!.id).then(d => d.drafts ?? []),
        enabled: !!user?.id,
    });
    const drafts = data ?? [];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                minHeight: "100%",
                paddingBottom: 10
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 90, marginBottom: 25 }}>
                <TouchableOpacity
                    onPress={() => {
                        router.push('/profile')
                    }}>
                    <Ionicons name="arrow-back" size={28} color={Colors[colorScheme].icon} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Saved Drafts</Text>
            </View>

            {isLoading ? (
                <ActivityIndicator size="small" color="#E86A33" style={{ marginVertical: 40 }} />
            ) : drafts.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9FA1B7', paddingVertical: 40 }}>No saved drafts yet.</Text>
            ) : (
                <View style={[styles.journalListContainer, { backgroundColor: Colors[colorScheme].card }]}>
                    {drafts.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.journalItem,
                                index === drafts.length - 1 && styles.lastJournalItem,
                                { borderBottomColor: colorScheme === 'dark' ? '#333' : '#F0F0F0' }
                            ]}
                        >
                            <TouchableOpacity
                                style={{ flexDirection: "row", alignItems: "center", }}
                                onPress={() => router.push({ pathname: '/record-experience', params: { draftId: item.id } })}
                            >
                                <View style={styles.journalTextContainer}>
                                    <Text style={[styles.journalItemTitle, { color: Colors[colorScheme].text }]}>{item.dish_name || 'Untitled Draft'}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <Text style={{ fontSize: 12, color: "#737588ff", fontWeight: '600', letterSpacing: 1 }}>
                                            {new Date(item.updated_at).toLocaleDateString()}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color="#9FA1B7" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Bottom padding for scrollability */}
            < View style={{ height: 100 }} />

        </ScrollView>
    )
}
export default SavedDrafts
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

    journalListContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    journalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    lastJournalItem: {
        borderBottomWidth: 0,
    },

    journalTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
        padding: 7,
    },
    journalItemTitle: {
        fontFamily: "LibreBaskerville",
        fontSize: 16,
        color: '#000',
        marginBottom: 4,
    },

})
