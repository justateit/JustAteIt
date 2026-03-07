import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || 'Error signing up';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      }
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || 'Invalid code';
      Alert.alert('Error', message);
    } finally {
      setVerifyLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.helpText}>A code has been sent to your inbox.</Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Verification Code"
          style={styles.input}
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.button, (verifyLoading || !isLoaded) && styles.buttonDisabled]}
          onPress={onVerifyPress}
          disabled={verifyLoading || !isLoaded}
        >
          {verifyLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        value={emailAddress}
        onChangeText={setEmailAddress}
        placeholder="Email"
        autoCapitalize="none"
        style={styles.input}
        keyboardType="email-address"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.button, (loading || !isLoaded) && styles.buttonDisabled]}
        onPress={onSignUpPress}
        disabled={loading || !isLoaded}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/sign-in">
          <Text style={styles.link}>Sign in</Text>
        </Link>
      </View>
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
  helpText: {
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footerText: {
    color: '#1A1A1A',
  },
  link: {
    color: '#EC3750',
    fontWeight: '700',
  },
});
