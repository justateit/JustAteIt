import DishCard from '@/components/DishCard';
import ExploreCitiesCard from '@/components/ExploreCitiesCard';
import HorizontalDishCard from '@/components/HorizontalDishCard';
import { SearchBar } from '@/components/SearchBar';
import { DishCardSkeleton, DiscoverSkeleton } from '@/components/SkeletonPlaceholder';
import { icons } from '@/constants/icons';
import { freshLogs, trendingDishes } from '@/data/mockdata';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';
import { getLogs } from '../../utils/flavorProfileApi';

export default function HomeScreen() {
  const { colorScheme } = useTheme();
  const { user } = useUser();

  const [fontsLoaded] = useFonts({
    'LibreBaskerville': require('@/assets/fonts/LibreBaskerville-VariableFont_wght.ttf'),
    'LibreBaskervilleItalic': require('@/assets/fonts/LibreBaskerville-Italic-VariableFont_wght.ttf'),
  });

  const { data: userLogs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['freshLogs', user?.id],
    queryFn: () => (user?.id ? getLogs(user.id).then((d: any) => d.logs ?? []) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  const displayLogs = useMemo(() => {
    if (userLogs && userLogs.length > 0) {
      return userLogs.map((l: any) => ({
        id: l.id,
        title: l.dish_name || 'Untitled Dish',
        restaurant: l.venue_name || 'Unknown Place',
        date: l.created_at || '',
        rating: l.rating ?? 0,
        image: l.image_url ? { uri: l.image_url } : null,
        location: l.city || '',
        tastingNotes: l.sensory_notes || '',
        tags: [],
      }));
    }
    return freshLogs;
  }, [userLogs]);

  // Replace blank conditional render (return null) with theme-aware skeleton screen
  if (!fontsLoaded) {
    return <DiscoverSkeleton />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        minHeight: "100%",
        paddingBottom: 10
      }}
    >
      <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Discover</Text>
      <Text style={{ fontSize: 14, color: colorScheme === 'dark' ? '#AAA' : '#737588ff', marginBottom: 35 }}>CURATED TASTES & LOCAL GEMS</Text>
      <SearchBar
        value=""
        onChangeText={() => { }}
        placeholder="Search dishes, flavors, cities..."
        onPress={() => router.push('/search')}
      />

      {/* Trending Section */}
      <View style={styles.sectionHeader}>
        <Image
          source={icons.fire}
          style={{ width: 16, height: 16 }}
          resizeMode="contain"
        />
        <Text style={[styles.sectionText, { color: Colors[colorScheme].text }]}>TRENDING IN PARIS</Text>
      </View>
      <FlatList
        data={trendingDishes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DishCard {...item} />}
      />

      {/* Fresh Logs Section */}
      <View style={styles.freshLogsHeader}>
        <Text style={[styles.sectionText, { color: Colors[colorScheme].text }]}>FRESH LOGS</Text>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          onPress={() => router.push('/my_logs')}>
          <Text style={{ fontSize: 12, color: "#737588ff", fontWeight: '600', letterSpacing: 1 }}>View All</Text>
          <Ionicons name="chevron-forward" size={12} color="#9FA1B7" />
        </TouchableOpacity>
      </View>

      {/* Realistic card skeletons when fetching fresh logs */}
      {isLogsLoading ? (
        <View style={{ gap: 12 }}>
          <DishCardSkeleton />
          <DishCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={displayLogs}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HorizontalDishCard {...item} />}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
        />
      )}

      {/* Explore Cities Section */}
      <ExploreCitiesCard
        onPress={() => router.push('/global_venues')}
      />

      {/* Bottom padding for scrollability */}
      <View style={{ height: 100 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F0E6",
    padding: 20,
  },
  title: {
    fontFamily: "LibreBaskerville",
    fontSize: 48,
    marginTop: 80,
    marginBottom: 10,
    letterSpacing: -1
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 12,
  },
  freshLogsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 45,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  }
});