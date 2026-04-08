import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@justateit/onboarding_complete';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    /* ignore */
  }
}
