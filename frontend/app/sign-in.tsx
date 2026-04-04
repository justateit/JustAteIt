import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      const attempt = await signIn.create({ identifier: emailAddress, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Login</Text>
        </View>
        <Text style={styles.subtitle}>ACCESS THE ARCHIVE</Text>

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="hello@example.com"
          placeholderTextColor="#C0C0C0"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password */}
        <View style={styles.passwordLabelRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={() => router.push('/reset-password')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#C0C0C0"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Keep me signed in */}
        <TouchableOpacity
          style={styles.keepRow}
          onPress={() => setKeepSignedIn(!keepSignedIn)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
            {keepSignedIn && <Feather name="check" size={12} color="#fff" />}
          </View>
          <Text style={styles.keepText}>Keep me signed in</Text>
        </TouchableOpacity>

        {/* LOGIN button */}
        <TouchableOpacity
          style={[styles.blackBtn, (!isLoaded || loading) && styles.disabled]}
          onPress={onSignInPress}
          disabled={!isLoaded || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.blackBtnText}>LOGIN</Text>}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Authenticate — email OTP passwordless flow */}
        <TouchableOpacity
          style={styles.orangeBtn}
          onPress={() => router.push('/authenticate')}
        >
          <Text style={styles.orangeBtnText}>AUTHENTICATE</Text>
        </TouchableOpacity>

        {/* Create account */}
        <TouchableOpacity style={styles.createRow} onPress={() => router.push('/sign-up')}>
          <Text style={styles.orangeLink}>Create an account</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  backBtn: { paddingRight: 4, paddingVertical: 4 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#000' },
  subtitle: {
    fontFamily: monoFont,
    fontSize: 11,
    color: '#AAAAAA',
    letterSpacing: 2,
    marginBottom: 32,
  },
  label: { fontSize: 15, fontWeight: '500', color: '#111', marginBottom: 8 },
  input: {
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
    marginBottom: 20,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotText: { color: '#E86A33', fontSize: 13, fontWeight: '500' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    marginBottom: 20,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
  },
  eyeBtn: { padding: 4 },
  keepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: '#E86A33',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#E86A33' },
  keepText: { fontSize: 14, color: '#333' },
  blackBtn: {
    backgroundColor: '#111',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 20,
  },
  blackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  disabled: { opacity: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dividerText: { fontSize: 13, color: '#999' },
  orangeBtn: {
    backgroundColor: '#E86A33',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 24,
  },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  createRow: { alignItems: 'center' },
  orangeLink: { color: '#E86A33', fontSize: 15, fontWeight: '500' },
});