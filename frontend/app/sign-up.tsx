import { useSignUp } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });
const BG = ['#100B06', '#1E1109', '#120904'] as const;

function GlassScreen({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={BG} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.flex}>
              <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded || loading) return;
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Error signing up');
    } finally { setLoading(false); }
  };

  const onVerifyPress = async () => {
    if (!isLoaded || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: otp.join('') });
      if (attempt.status === 'complete') { await setActive({ session: attempt.createdSessionId }); router.replace('/(tabs)'); }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Invalid code');
    } finally { setVerifyLoading(false); }
  };

  const handleOtpChange = (text: string, i: number) => {
    const n = [...otp]; n[i] = text.slice(-1); setOtp(n);
    if (text && i < otp.length - 1) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  if (pendingVerification) {
    return (
      <GlassScreen>
        <TouchableOpacity onPress={() => setPendingVerification(false)} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F5EDE0" />
        </TouchableOpacity>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.verifySubtitle}>
          We sent a code to <Text style={styles.emailHighlight}>{email}</Text>{'\n'}
          enter the 6 digit code sent to your inbox
        </Text>
        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <TextInput key={i} ref={r => { otpRefs.current[i] = r; }} style={styles.otpBox}
              value={d} onChangeText={t => handleOtpChange(t, i)} onKeyPress={e => handleOtpKey(e, i)}
              keyboardType="number-pad" keyboardAppearance="dark" maxLength={1} textAlign="center" />
          ))}
        </View>
        <TouchableOpacity style={[styles.orangeBtn, verifyLoading && styles.disabled]} onPress={onVerifyPress} disabled={verifyLoading}>
          {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.orangeBtnText}>Verify Code</Text>}
        </TouchableOpacity>
        <View style={styles.row}><Text style={styles.dimText}>Haven't gotten the email yet? </Text>
          <TouchableOpacity onPress={onSignUpPress}><Text style={styles.orangeLink}>Resend email</Text></TouchableOpacity></View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F5EDE0" />
        </TouchableOpacity>
        <Text style={styles.title}>Welcome</Text>
      </View>
      <Text style={styles.subtitle}>ACCESS THE ARCHIVE</Text>

      <View style={styles.card}>
        <View style={styles.underlineRow}>
          <Feather name="mail" size={17} color="rgba(245,237,224,0.35)" style={styles.icon} />
          <TextInput style={styles.underlineInput} value={email} onChangeText={setEmail}
            placeholder="Enter email address" placeholderTextColor="rgba(245,237,224,0.28)"
            autoCapitalize="none" keyboardType="email-address" keyboardAppearance="dark" />
        </View>
        <View style={styles.underlineRow}>
          <Feather name="user" size={17} color="rgba(245,237,224,0.35)" style={styles.icon} />
          <TextInput style={styles.underlineInput} value={username} onChangeText={setUsername}
            placeholder="Create a username" placeholderTextColor="rgba(245,237,224,0.28)"
            autoCapitalize="none" keyboardAppearance="dark" />
        </View>
        <View style={styles.underlineRow}>
          <Feather name="lock" size={17} color="rgba(245,237,224,0.35)" style={styles.icon} />
          <TextInput style={styles.underlineInput} value={password} onChangeText={setPassword}
            placeholder="Create a Password" placeholderTextColor="rgba(245,237,224,0.28)"
            secureTextEntry={!showPassword} keyboardAppearance="dark" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="rgba(245,237,224,0.35)" />
          </TouchableOpacity>
        </View>
        <View style={[styles.underlineRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
          <Feather name="lock" size={17} color="rgba(245,237,224,0.35)" style={styles.icon} />
          <TextInput style={styles.underlineInput} value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="Confirm password" placeholderTextColor="rgba(245,237,224,0.28)"
            secureTextEntry={!showConfirmPassword} keyboardAppearance="dark" />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} color="rgba(245,237,224,0.35)" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.orangeBtn, (!isLoaded || loading) && styles.disabled]} onPress={onSignUpPress} disabled={!isLoaded || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.orangeBtnText}>CREATE ACCOUNT</Text>}
      </TouchableOpacity>
      <View style={styles.row}>
        <Text style={styles.dimText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/sign-in')}><Text style={styles.orangeLink}>Sign in</Text></TouchableOpacity>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 }, safeArea: { flex: 1, backgroundColor: 'transparent' }, flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  backBtn: { paddingRight: 4, paddingVertical: 4, marginBottom: 8 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#F5EDE0' },
  subtitle: { fontFamily: monoFont, fontSize: 11, color: 'rgba(245,237,224,0.38)', letterSpacing: 2, marginBottom: 26 },
  card: { backgroundColor: 'rgba(255,248,240,0.06)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,210,160,0.12)', padding: 20, marginBottom: 24 },
  underlineRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,210,160,0.18)', paddingBottom: 12, marginBottom: 20 },
  icon: { marginRight: 12 },
  underlineInput: { flex: 1, fontSize: 15, color: '#F5EDE0' },
  verifySubtitle: { fontSize: 14, color: 'rgba(245,237,224,0.55)', lineHeight: 20, marginBottom: 28, marginTop: 8 },
  emailHighlight: { color: '#F5EDE0', fontWeight: '500' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 8 },
  otpBox: { flex: 1, aspectRatio: 1, backgroundColor: 'rgba(255,248,240,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,210,160,0.2)', borderRadius: 12, fontSize: 22, color: '#F5EDE0', textAlign: 'center' },
  orangeBtn: { backgroundColor: '#E86A33', borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginBottom: 20 },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1.5 },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dimText: { fontSize: 14, color: 'rgba(245,237,224,0.5)' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 14 },
});