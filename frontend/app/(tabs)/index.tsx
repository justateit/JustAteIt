import DishCard from '@/components/DishCard';
import ExploreCitiesCard from '@/components/ExploreCitiesCard';
import HorizontalDishCard from '@/components/HorizontalDishCard';
import { SearchBar } from '@/components/SearchBar';
import { icons } from '@/constants/icons';
import { freshLogs, trendingDishes } from '@/data/mockdata';
import { useFeedTelemetry } from '@/hooks/useFeedTelemetry';
import { getAlgorithmicFeed } from '@/utils/flavorProfileApi';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const { user } = useUser();
  const [fontsLoaded] = useFonts({
    'LibreBaskerville': require('@/assets/fonts/LibreBaskerville-VariableFont_wght.ttf'),
    'LibreBaskervilleItalic': require('@/assets/fonts/LibreBaskerville-Italic-VariableFont_wght.ttf'),
  });

  const [feedDishes, setFeedDishes] = useState<any[]>(freshLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Viewport dwell-time and impression telemetry tracker
  const { onViewableItemsChanged, viewabilityConfig } = useFeedTelemetry(user?.id);

  const fetchFeed = useCallback(async () => {
    try {
      setIsLoadingFeed(true);
      const data = await getAlgorithmicFeed({
        userId: user?.id,
        page: 1,
        limit: 15,
      });

      if (data?.feed && data.feed.length > 0) {
        // Map backend feed items, preserving fallback demo photos if image is null
        const mapped = data.feed.map((item: any, idx: number) => ({
          ...item,
          image: item.image || freshLogs[idx % freshLogs.length]?.image,
        }));
        setFeedDishes(mapped);
      }
    } catch (err) {
      console.warn('[HomeScreen] Could not load algorithmic feed, using fallback:', err);
    } finally {
      setIsLoadingFeed(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  if (!fontsLoaded) return null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#FF6B4A"
        />
      }
      contentContainerStyle={{
        minHeight: "100%",
        paddingBottom: 10,
      }}
    >
      <Text style={styles.title}>Discover</Text>
      <Text style={{ fontSize: 14, color: '#737588ff', marginBottom: 35 }}>CURATED TASTES & LOCAL GEMS</Text>
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
        <Text style={styles.sectionText}>TRENDING IN PARIS</Text>
      </View>
      <FlatList
        data={trendingDishes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <DishCard {...item} />}
      />

      {/* Recommended Algorithmic Feed Section */}
      <View style={styles.freshLogsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={14} color="#FF6B4A" />
          <Text style={styles.sectionText}>RECOMMENDED FOR YOU</Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          onPress={() => router.push('/logs')}
        >
          <Text style={{ fontSize: 12, color: "#737588ff", fontWeight: '600', letterSpacing: 1 }}>View All</Text>
          <Ionicons name="chevron-forward" size={12} color="#9FA1B7" />
        </TouchableOpacity>
      </View>

      {isLoadingFeed && feedDishes.length === 0 ? (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#FF6B4A" />
        </View>
      ) : (
        <FlatList
          data={feedDishes}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <HorizontalDishCard {...item} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
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
    letterSpacing: -1,
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
  },
});