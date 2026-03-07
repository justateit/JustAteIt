import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ResetPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const onRequestReset = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signIn?.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });
      setStep('reset');
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || 'Error requesting reset';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!isLoaded || resetLoading) return;
    setResetLoading(true);
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      if (result?.status === 'complete') {
        await setActive?.({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || 'Error resetting password';
      Alert.alert('Error', message);
    } finally {
      setResetLoading(false);
    }
  };

  if (step === 'reset') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set New Password</Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Reset Code from Email"
          style={styles.input}
          keyboardType="number-pad"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="New Password"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.button, (resetLoading || !isLoaded) && styles.buttonDisabled]}
          onPress={onReset}
          disabled={resetLoading || !isLoaded}
        >
          {resetLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Reset Password</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        value={emailAddress}
        onChangeText={setEmailAddress}
        placeholder="Email Address"
        autoCapitalize="none"
        style={styles.input}
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.button, (loading || !isLoaded) && styles.buttonDisabled]}
        onPress={onRequestReset}
        disabled={loading || !isLoaded}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/sign-in')}>
        <Text style={styles.link}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: '#EC3750',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: '#EC3750',
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 8,
  },
});
