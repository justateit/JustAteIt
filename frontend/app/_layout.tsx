import BottomNav from '@/components/BottomNav';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import "./globals.css";

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootBottomNav() {
  const pathname = usePathname();
  // Only show for root-level screens that need it (not tabs — those have their own BottomNav)
  if (pathname !== '/record-experience' && pathname !== '/profile') return null;
  return <BottomNav />;
}

const tokenCache = {
  async getToken(key: string) {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.error('AsyncStorage get item error: ', error)
      await AsyncStorage.removeItem(key)
      return null
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return AsyncStorage.setItem(key, value)
    } catch (err) {
      return
    }
  },
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_dGllZC1maXRjaGUtc2t1bmstNTYuY2xlcmsuYWNjb3VudHMuZGV2JA'; // added a dummy key to prevent crashes if .env is missing. User should replace this.

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ClerkLoaded>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <View style={styles.container}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="record-experience" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="sign-up" options={{ headerShown: false }} />
                <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="authenticate" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
              <RootBottomNav />
            </View>
          </ThemeProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});