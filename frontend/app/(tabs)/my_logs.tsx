import HorizontalDishCard from '@/components/HorizontalDishCard';
import SearchBar from '@/components/SearchBar';
import { freshLogs } from '@/data/mockdata';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
    const [fontsLoaded] = useFonts({
        'LibreBaskerville': require('@/assets/fonts/LibreBaskerville-VariableFont_wght.ttf'),
        'LibreBaskervilleItalic': require('@/assets/fonts/LibreBaskerville-Italic-VariableFont_wght.ttf'),
    });

    const [activeFilter, setActiveFilter] = useState('all');

    if (!fontsLoaded) return null;

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
                <Text style={styles.title}>Saved Logs</Text>
            </View>
            <SearchBar
                value=""
                onChangeText={() => { }}
                placeholder="Search bookmarked dishes..."
                onPress={() => router.push('/search')}
            />
            {/* All, Recent, Cuisine */}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 20, marginBottom: 20, marginLeft: 5, marginRight: 5 }}>
                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('all')}>
                    <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'recent' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('recent')}>
                    <Text style={[styles.filterText, activeFilter === 'recent' && styles.filterTextActive]}>Recent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterButton, activeFilter === 'cuisine' && styles.filterButtonActive]}
                    onPress={() => setActiveFilter('cuisine')}>
                    <Text style={[styles.filterText, activeFilter === 'cuisine' && styles.filterTextActive]}>Cuisine</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={freshLogs}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <HorizontalDishCard {...item} />}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 12 }}
            />


            {/* Bottom padding for scrollability */}
            <View style={{ height: 100 }} />

        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F0E6",
        padding: 20,
    },
    title: {
        fontFamily: "LibreBaskerville",
        fontSize: 38,
        letterSpacing: -1
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 20,
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    filterButton: {
        backgroundColor: '#ffffffff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 100,
        maxHeight: 35,
        marginLeft: 1,
        marginRight: 1,
        borderColor: 'rgba(0,0,0,0.3)',
        borderWidth: 0.5,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 1,
    },
    filterButtonActive: {
        backgroundColor: '#E86A33',
        borderColor: '#E86A33',
    },
    filterTextActive: {
        color: '#fff',
    }
});