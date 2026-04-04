import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
    <LinearGradient colors={['#100B06', '#1E1109', '#120904']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.flex}>
              <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color="#F5EDE0" />
                  </TouchableOpacity>
                  <Text style={styles.title}>Login</Text>
                </View>
                <Text style={styles.subtitle}>ACCESS THE ARCHIVE</Text>

                {/* Glass card */}
                <View style={styles.card}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={emailAddress}
                    onChangeText={setEmailAddress}
                    placeholder="hello@example.com"
                    placeholderTextColor="rgba(245,237,224,0.28)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    keyboardAppearance="dark"
                  />

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
                      placeholderTextColor="rgba(245,237,224,0.28)"
                      secureTextEntry={!showPassword}
                      keyboardAppearance="dark"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="rgba(245,237,224,0.45)" />
                    </TouchableOpacity>
                  </View>

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
                </View>

                {/* LOGIN button */}
                <TouchableOpacity
                  style={[styles.blackBtn, (!isLoaded || loading) && styles.disabled]}
                  onPress={onSignInPress}
                  disabled={!isLoaded || loading}
                >
                  {loading
                    ? <ActivityIndicator color="#F5EDE0" />
                    : <Text style={styles.blackBtnText}>LOGIN</Text>}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or sign in with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Authenticate */}
                <TouchableOpacity style={styles.orangeBtn} onPress={() => router.push('/authenticate')}>
                  <Text style={styles.orangeBtnText}>AUTHENTICATE</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.createRow} onPress={() => router.push('/sign-up')}>
                  <Text style={styles.orangeLink}>Create an account</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  backBtn: { paddingRight: 4, paddingVertical: 4 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#F5EDE0' },
  subtitle: {
    fontFamily: monoFont, fontSize: 11,
    color: 'rgba(245,237,224,0.38)', letterSpacing: 2, marginBottom: 26,
  },
  card: {
    backgroundColor: 'rgba(255,248,240,0.06)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.12)',
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(245,237,224,0.55)', marginBottom: 8, letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,248,240,0.07)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.15)',
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE0', marginBottom: 18,
  },
  passwordLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  forgotText: { color: '#E86A33', fontSize: 12, fontWeight: '600' },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,248,240,0.07)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.15)',
    marginBottom: 18, paddingRight: 12,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE0',
  },
  eyeBtn: { padding: 4 },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: '#E86A33',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#E86A33' },
  keepText: { fontSize: 14, color: 'rgba(245,237,224,0.7)' },
  blackBtn: {
    backgroundColor: 'rgba(10,6,3,0.75)',
    borderRadius: 30, paddingVertical: 17,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  blackBtnText: { color: '#F5EDE0', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  disabled: { opacity: 0.45 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,210,160,0.12)' },
  dividerText: { fontSize: 12, color: 'rgba(245,237,224,0.35)' },
  orangeBtn: {
    backgroundColor: '#E86A33', borderRadius: 30,
    paddingVertical: 17, alignItems: 'center', marginBottom: 24,
  },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  createRow: { alignItems: 'center' },
  orangeLink: { color: '#E86A33', fontSize: 15, fontWeight: '500' },
});