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

type Step = 'email' | 'otp' | 'setPassword' | 'success';

export default function ResetPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const onRequestReset = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Error sending reset email');
    } finally { setLoading(false); }
  };

  const onVerifyOtp = () => {
    if (otp.join('').length < 5) { Alert.alert('Error', 'Please enter the full 5-digit code'); return; }
    setStep('setPassword');
  };

  const onUpdatePassword = async () => {
    if (!isLoaded || loading) return;
    if (newPassword !== confirmNewPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp.join(''),
        password: newPassword,
      });
      if (result.status === 'complete') { await setActive({ session: result.createdSessionId }); setStep('success'); }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Could not reset password');
      setStep('otp');
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
      <Text style={s.title}>Forgot password?</Text>
      <Text style={s.subtitle}>Please enter your email to reset the password</Text>

      <Text style={s.label}>Your Email</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail}
        placeholder="Enter your email address" placeholderTextColor="rgba(245,237,224,0.28)"
        autoCapitalize="none" keyboardType="email-address" keyboardAppearance="dark" />

      <TouchableOpacity style={[s.orangeBtn, loading && s.disabled]} onPress={onRequestReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.orangeBtnText}>Reset Password</Text>}
      </TouchableOpacity>
    </GlassScreen>
  );

  // ── OTP ───────────────────────────────────────────────────────────────────────
  if (step === 'otp') return (
    <GlassScreen>
      <TouchableOpacity onPress={() => setStep('email')} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color="#F5EDE0" />
      </TouchableOpacity>
      <Text style={s.title}>Check your email</Text>
      <Text style={s.subtitle}>
        We sent a reset link to <Text style={s.highlight}>{email}</Text>
        {'\n'}enter the 5 digit code sent in the email
      </Text>

      <View style={s.otpRow}>
        {otp.map((d, i) => (
          <TextInput key={i} ref={r => { otpRefs.current[i] = r; }} style={s.otpBox}
            value={d} onChangeText={t => handleOtpChange(t, i)} onKeyPress={e => handleOtpKey(e, i)}
            keyboardType="number-pad" keyboardAppearance="dark" maxLength={1} textAlign="center" />
        ))}
      </View>

      <TouchableOpacity style={s.orangeBtn} onPress={onVerifyOtp}>
        <Text style={s.orangeBtnText}>Verify Code</Text>
      </TouchableOpacity>
      <View style={s.row}>
        <Text style={s.dimText}>Haven't gotten the email yet? </Text>
        <TouchableOpacity onPress={onRequestReset}><Text style={s.orangeLink}>Resend email</Text></TouchableOpacity>
      </View>
    </GlassScreen>
  );

  // ── Set new password ──────────────────────────────────────────────────────────
  if (step === 'setPassword') return (
    <GlassScreen>
      <TouchableOpacity onPress={() => setStep('otp')} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color="#F5EDE0" />
      </TouchableOpacity>
      <Text style={s.title}>Set a new password</Text>
      <Text style={s.subtitle}>Create a new password. Ensure it differs from previous ones for security.</Text>

      <View style={s.card}>
        <Text style={s.label}>Password</Text>
        <View style={s.passwordContainer}>
          <TextInput style={s.passwordInput} value={newPassword} onChangeText={setNewPassword}
            placeholder="" placeholderTextColor="rgba(245,237,224,0.28)"
            secureTextEntry={!showPassword} keyboardAppearance="dark" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="rgba(245,237,224,0.45)" />
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Confirm Password</Text>
        <View style={[s.passwordContainer, { marginBottom: 0 }]}>
          <TextInput style={s.passwordInput} value={confirmNewPassword} onChangeText={setConfirmNewPassword}
            placeholder="" placeholderTextColor="rgba(245,237,224,0.28)"
            secureTextEntry={!showConfirmPassword} keyboardAppearance="dark" />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={s.eyeBtn}>
            <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="rgba(245,237,224,0.45)" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[s.orangeBtn, loading && s.disabled]} onPress={onUpdatePassword} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.orangeBtnText}>Update Password</Text>}
      </TouchableOpacity>
    </GlassScreen>
  );

  // ── Success ───────────────────────────────────────────────────────────────────
  return (
    <GlassScreen>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color="#F5EDE0" />
      </TouchableOpacity>
      <Text style={s.title}>Password reset</Text>
      <Text style={s.subtitle}>
        Your password has been successfully reset.{'\n'}Click confirm to continue.
      </Text>
      <TouchableOpacity style={s.orangeBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={s.orangeBtnText}>Confirm</Text>
      </TouchableOpacity>
    </GlassScreen>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 }, safeArea: { flex: 1, backgroundColor: 'transparent' }, flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 48 },
  backBtn: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 16 },
  title: { fontFamily: serifFont, fontSize: 34, color: '#F5EDE0', marginBottom: 10 },
  subtitle: { fontSize: 14, color: 'rgba(245,237,224,0.5)', lineHeight: 20, marginBottom: 28 },
  highlight: { color: '#F5EDE0', fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(245,237,224,0.55)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,248,240,0.07)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.15)', paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE0', marginBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255,248,240,0.06)', borderRadius: 22, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.12)', padding: 20, marginBottom: 24,
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,248,240,0.07)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,210,160,0.15)', marginBottom: 20, paddingRight: 12,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#F5EDE0' },
  eyeBtn: { padding: 4 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 10 },
  otpBox: {
    flex: 1, aspectRatio: 1, backgroundColor: 'rgba(255,248,240,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,210,160,0.2)',
    borderRadius: 12, fontSize: 22, color: '#F5EDE0', textAlign: 'center',
  },
  orangeBtn: { backgroundColor: '#E86A33', borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginBottom: 20 },
  orangeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dimText: { fontSize: 13, color: 'rgba(245,237,224,0.45)' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 13 },
});