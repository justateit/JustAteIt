import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });
const BG = ['#100B06', '#1E1109', '#120904'] as const;

function GlassScreen({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={BG} style={s.gradient}>
      <SafeAreaView style={s.safeArea}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.flex}>
            <ScrollView
              contentContainerStyle={s.scroll}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type Step = 'email' | 'otp';

export default function AuthenticateScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const onSendCode = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signIn.create({ strategy: 'email_code', identifier: email });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Could not send code. Ensure your email is registered.');
    } finally { setLoading(false); }
  };

  const onVerify = async () => {
    if (!isLoaded || loading) return;
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Please enter the full 6-digit code'); return; }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      if (result.status === 'complete') { await setActive({ session: result.createdSessionId }); router.replace('/(tabs)'); }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (text: string, i: number) => {
    const n = [...otp]; n[i] = text.slice(-1); setOtp(n);
    if (text && i < otp.length - 1) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  // ── Email ─────────────────────────────────────────────────────────────────────
  if (step === 'email') return (
    <GlassScreen>
      <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color="#F5EDE0" />
      </TouchableOpacity>
      <Text style={s.title}>Authenticate</Text>
      <Text style={s.monoSub}>PASSWORDLESS ACCESS</Text>
      <Text style={s.subtitle}>
        Enter your email and we'll send you a one-time code to sign in instantly.
      </Text>

      <Text style={s.label}>Email Address</Text>
      <TextInput
        style={s.input} value={email} onChangeText={setEmail}
        placeholder="hello@example.com" placeholderTextColor="rgba(245,237,224,0.28)"
        autoCapitalize="none" keyboardType="email-address" keyboardAppearance="dark"
      />

      <TouchableOpacity style={[s.orangeBtn, (!isLoaded || loading) && s.disabled]} onPress={onSendCode} disabled={!isLoaded || loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.orangeBtnText}>SEND CODE</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.backToLogin} onPress={() => router.push('/sign-in')}>
        <Text style={s.dimText}>Back to login</Text>
      </TouchableOpacity>
    </GlassScreen>
  );

  // ── OTP ───────────────────────────────────────────────────────────────────────
  return (
    <GlassScreen>
      <TouchableOpacity onPress={() => setStep('email')} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color="#F5EDE0" />
      </TouchableOpacity>
      <Text style={s.title}>Check your email</Text>
      <Text style={s.subtitle}>
        We sent a 6-digit code to <Text style={s.highlight}>{email}</Text>
        {'\n'}Enter the code below to sign in.
      </Text>

      <View style={s.otpRow}>
        {otp.map((d, i) => (
          <TextInput key={i} ref={r => { otpRefs.current[i] = r; }} style={s.otpBox}
            value={d} onChangeText={t => handleOtpChange(t, i)} onKeyPress={e => handleOtpKey(e, i)}
            keyboardType="number-pad" keyboardAppearance="dark" maxLength={1} textAlign="center" />
        ))}
      </View>

      <TouchableOpacity style={[s.orangeBtn, loading && s.disabled]} onPress={onVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.orangeBtnText}>Verify Code</Text>}
      </TouchableOpacity>

      <View style={s.row}>
        <Text style={s.dimText}>Didn't get the email? </Text>
        <TouchableOpacity onPress={onSendCode}><Text style={s.orangeLink}>Resend email</Text></TouchableOpacity>
      </View>
    </GlassScreen>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 }, safeArea: { flex: 1, backgroundColor: 'transparent' }, flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 48 },
  backBtn: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#F5EDE0', marginBottom: 4 },
  monoSub: { fontFamily: monoFont, fontSize: 11, color: 'rgba(245,237,224,0.38)', letterSpacing: 2, marginBottom: 12 },
  subtitle: { fontSize: 14, color: 'rgba(245,237,224,0.5)', lineHeight: 20, marginBottom: 28 },
  highlight: { color: '#F5EDE0', fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(245,237,224,0.55)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,248,240,0.07)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.15)', paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE0', marginBottom: 24,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 8 },
  otpBox: {
    flex: 1, aspectRatio: 1, backgroundColor: 'rgba(255,248,240,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,210,160,0.2)',
    borderRadius: 12, fontSize: 22, color: '#F5EDE0', textAlign: 'center',
  },
  orangeBtn: { backgroundColor: '#E86A33', borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginBottom: 20 },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  disabled: { opacity: 0.45 },
  backToLogin: { alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dimText: { fontSize: 13, color: 'rgba(245,237,224,0.45)' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 13 },
});
