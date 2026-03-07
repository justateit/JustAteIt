import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Securely store the token on the Android device
const tokenCache = {
  async getToken(key: string) {
    try { return SecureStore.getItemAsync(key); } catch (err) { return null; }
  },
  async saveToken(key: string, value: string) {
    try { return SecureStore.setItemAsync(key, value); } catch (err) { return; }
  },
};

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    
    // Check if the user is trying to access an auth screen
    const inAuthGroup = segments[0] === '(auth)';
    
    if (isSignedIn && inAuthGroup) {
      router.replace('/'); // Send to home if signed in
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in'); // Force sign in
    }
  }, [isSignedIn, segments, isLoaded]);

  return <Slot />;
};

export default function RootLayout() {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <InitialLayout />
    </ClerkProvider>
  );
}
