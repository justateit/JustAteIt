import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const journalData = [
    {
        id: '1',
        date: 'Yesterday',
        title: 'Smoked Eel & Beetroot',
    },
    {
        id: '2',
        date: '3/11/2026',
        title: 'Uni & Truffle Toast',

    },
    {
        id: '3',
        date: '2/5/2026',
        title: 'Charred Octopus',
    },
    {
        id: '4',
        date: '1/20/2026',
        title: 'Tonkotsu Ramen',
    },
];


interface Props {
    onPress: () => void;
}
const SavedDrafts = ({ onPress }: Props) => {
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
                    onPress={() => {
                        router.push('/profile')
                    }}>
                    <Ionicons name="arrow-back" size={28} color="#918f8fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Saved Drafts</Text>
            </View>


            <View style={styles.journalListContainer}>
                {journalData.map((item, index) => (
                    <View
                        key={item.id}
                        style={[
                            styles.journalItem,
                            index === journalData.length - 1 && styles.lastJournalItem
                        ]}
                    >
                        <TouchableOpacity
                            style={{ flexDirection: "row", alignItems: "center", }}>
                            <View style={styles.journalTextContainer}>
                                <Text style={styles.journalItemTitle}>{item.title}</Text>
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Text style={{ fontSize: 12, color: "#737588ff", fontWeight: '600', letterSpacing: 1 }}>{item.date}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#9FA1B7" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

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
