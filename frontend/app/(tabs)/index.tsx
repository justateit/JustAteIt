import DishCard from '@/components/DishCard';
import ExploreCitiesCard from '@/components/ExploreCitiesCard';
import HorizontalDishCard from '@/components/HorizontalDishCard';
import SearchBar from '@/components/SearchBar';
import { icons } from '@/constants/icons';
import { freshLogs, trendingDishes } from '@/data/mockdata';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    'LibreBaskerville': require('@/assets/fonts/LibreBaskerville-VariableFont_wght.ttf'),
    'LibreBaskervilleItalic': require('@/assets/fonts/LibreBaskerville-Italic-VariableFont_wght.ttf'),
  });

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
      <Text style={styles.title}>Discover</Text>
      <Text style={{ fontSize: 14, color: '#737588ff', marginBottom: 35 }}>CURATED TASTES & LOCAL GEMS</Text>
      <SearchBar
        value=""
        onChangeText={() => { }}
        onPress={() => { }}
        placeholder="Search dishes, flavors, cities..."
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DishCard {...item} />}
      />
      {/* Fresh Logs Section */}
      <View style={styles.freshLogsHeader}>
        <Text style={styles.sectionText}>FRESH LOGS</Text>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          onPress={() => router.push('/logs')}>

          <Text style={{ fontSize: 12, color: "#737588ff", fontWeight: '600', letterSpacing: 1 }}>View All</Text>
          <Ionicons name="chevron-forward" size={12} color="#9FA1B7" />
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
      {/* Explore Cities Section */}
      <ExploreCitiesCard
        onPress={() => router.push('/explore')}
      />

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