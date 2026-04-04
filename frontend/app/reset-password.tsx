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

  // ── Step 1: Request reset code ────────────────────────────────────────────────
  const onRequestReset = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────────
  const onVerifyOtp = () => {
    const code = otp.join('');
    if (code.length < 5) {
      Alert.alert('Error', 'Please enter the full 5-digit code');
      return;
    }
    setStep('setPassword');
  };

  // ── Step 3: Set new password ──────────────────────────────────────────────────
  const onUpdatePassword = async () => {
    if (!isLoaded || loading) return;
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp.join(''),
        password: newPassword,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        setStep('success');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Could not reset password');
      setStep('otp'); // send back to OTP if code was wrong
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

  // ── Screen: Enter email ───────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>Please enter your email to reset the password</Text>

          <Text style={styles.label}>Your Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={[styles.orangeBtn, loading && styles.disabled]}
            onPress={onRequestReset}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.orangeBtnText}>Reset Password</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen: Enter OTP ─────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => setStep('email')} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a reset link to{' '}
            <Text style={styles.emailHighlight}>{email}</Text>
            {'\n'}enter 5 digit code that is sent in the email
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

          <TouchableOpacity style={styles.orangeBtn} onPress={onVerifyOtp}>
            <Text style={styles.orangeBtnText}>Verify Code</Text>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Haven't gotten the email yet? </Text>
            <TouchableOpacity onPress={onRequestReset}>
              <Text style={styles.orangeLink}>Resend email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen: Set new password ──────────────────────────────────────────────────
  if (step === 'setPassword') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => setStep('otp')} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            Create a new password. Ensures it differs from previous ones for security.
          </Text>

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder=""
              placeholderTextColor="#C0C0C0"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              placeholder=""
              placeholderTextColor="#C0C0C0"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.orangeBtn, loading && styles.disabled]}
            onPress={onUpdatePassword}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.orangeBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen: Success ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Password reset</Text>
        <Text style={styles.subtitle}>
          Your password has been successfully reset.{'\n'}
          Click confirm to continue.
        </Text>
        <TouchableOpacity style={styles.orangeBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.orangeBtnText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  backBtn: { paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 16 },
  title: { fontFamily: serifFont, fontSize: 34, color: '#000', marginBottom: 10 },
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 10,
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
  orangeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { fontSize: 13, color: '#888' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 13 },
});