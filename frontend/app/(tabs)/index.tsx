import SearchBar from '@/components/SearchBar';
import { useFonts } from 'expo-font';
import { ScrollView, StyleSheet, Text } from 'react-native';

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
      <SearchBar
        value=""
        onChangeText={() => { }}
        onPress={() => { }}
        placeholder="Search dishes, flavors, cities..."
      />
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
    marginTop: 60,
    marginBottom: 20,
    letterSpacing: -1
  },
});