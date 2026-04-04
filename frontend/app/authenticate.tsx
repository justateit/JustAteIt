import { useSignIn } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

type Step = 'email' | 'otp';

export default function AuthenticateScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Step 1: send email OTP
  const onSendCode = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'email_code',
        identifier: email,
      });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Could not send code. Ensure your email is registered.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP
  const onVerify = async () => {
    if (!isLoaded || loading) return;
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Error', 'Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Screen: Email ─────────────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>

          <Text style={styles.title}>Authenticate</Text>
          <Text style={styles.monoSubtitle}>PASSWORDLESS ACCESS</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a one-time code to sign in.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="hello@example.com"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={[styles.orangeBtn, (!isLoaded || loading) && styles.disabled]}
            onPress={onSendCode}
            disabled={!isLoaded || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.orangeBtnText}>SEND CODE</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLogin} onPress={() => router.push('/sign-in')}>
            <Text style={styles.backToLoginText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen: OTP ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setStep('email')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <Text style={styles.emailHighlight}>{email}</Text>
          {'\n'}Enter the code below to sign in.
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { otpRefs.current[i] = ref; }}
              style={styles.otpBox}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, i)}
              onKeyPress={(e) => handleOtpKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.orangeBtn, loading && styles.disabled]}
          onPress={onVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.orangeBtnText}>Verify Code</Text>}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't get the email? </Text>
          <TouchableOpacity onPress={onSendCode}>
            <Text style={styles.orangeLink}>Resend email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  backBtn: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#000', marginBottom: 4 },
  monoSubtitle: {
    fontFamily: monoFont,
    fontSize: 11,
    color: '#AAAAAA',
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 28 },
  emailHighlight: { color: '#333', fontWeight: '500' },
  label: { fontSize: 15, fontWeight: '500', color: '#111', marginBottom: 8 },
  input: {
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
    marginBottom: 24,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    fontSize: 20,
    color: '#222',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
  },
  orangeBtn: {
    backgroundColor: '#E86A33',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 20,
  },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  disabled: { opacity: 0.5 },
  backToLogin: { alignItems: 'center' },
  backToLoginText: { color: '#999', fontSize: 14 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { fontSize: 13, color: '#888' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 13 },
});
