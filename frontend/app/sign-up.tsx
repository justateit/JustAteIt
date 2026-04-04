import { useSignUp } from '@clerk/clerk-expo';
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
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Error signing up');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded || verifyLoading) return;
    const code = otp.join('');
    setVerifyLoading(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.message || 'Invalid code');
    } finally {
      setVerifyLoading(false);
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

  // ── Verification screen ──────────────────────────────────────────────────────
  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => setPendingVerification(false)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.verifySubtitle}>
            We sent a code to <Text style={styles.emailHighlight}>{email}</Text>
            {'\n'}enter the 6 digit code that is sent in the email
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
            style={[styles.orangeBtn, verifyLoading && styles.disabled]}
            onPress={onVerifyPress}
            disabled={verifyLoading}
          >
            {verifyLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.orangeBtnText}>Verify Code</Text>}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Haven't gotten the email yet? </Text>
            <TouchableOpacity onPress={onSignUpPress}>
              <Text style={styles.orangeLink}>Resend email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sign up screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Welcome</Text>
        </View>
        <Text style={styles.subtitle}>ACCESS THE ARCHIVE</Text>

        {/* Email */}
        <View style={styles.underlineRow}>
          <Feather name="mail" size={18} color="#C0C0C0" style={styles.icon} />
          <TextInput
            style={styles.underlineInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Username */}
        <View style={styles.underlineRow}>
          <Feather name="user" size={18} color="#C0C0C0" style={styles.icon} />
          <TextInput
            style={styles.underlineInput}
            value={username}
            onChangeText={setUsername}
            placeholder="Create a username"
            placeholderTextColor="#C0C0C0"
            autoCapitalize="none"
          />
        </View>

        {/* Password with eye toggle */}
        <View style={styles.underlineRow}>
          <Feather name="lock" size={18} color="#C0C0C0" style={styles.icon} />
          <TextInput
            style={styles.underlineInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a Password"
            placeholderTextColor="#C0C0C0"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#C0C0C0" />
          </TouchableOpacity>
        </View>

        {/* Confirm Password with eye toggle */}
        <View style={[styles.underlineRow, { marginBottom: 40 }]}>
          <Feather name="lock" size={18} color="#C0C0C0" style={styles.icon} />
          <TextInput
            style={styles.underlineInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor="#C0C0C0"
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} color="#C0C0C0" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.orangeBtn, (!isLoaded || loading) && styles.disabled]}
          onPress={onSignUpPress}
          disabled={!isLoaded || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.orangeBtnText}>CREATE ACCOUNT</Text>}
        </TouchableOpacity>

        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/sign-in')}>
            <Text style={styles.orangeLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  backBtn: { paddingRight: 4, paddingVertical: 4, marginBottom: 8 },
  title: { fontFamily: serifFont, fontSize: 42, color: '#000' },
  subtitle: {
    fontFamily: monoFont,
    fontSize: 11,
    color: '#AAAAAA',
    letterSpacing: 2,
    marginBottom: 36,
  },
  underlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 24,
    paddingBottom: 10,
  },
  icon: { marginRight: 12 },
  underlineInput: { flex: 1, fontSize: 15, color: '#222' },
  verifySubtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 28, marginTop: 8 },
  emailHighlight: { color: '#444', fontWeight: '500' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 8 },
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
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { fontSize: 13, color: '#888' },
  orangeBtn: {
    backgroundColor: '#E86A33',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 20,
  },
  orangeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1.5 },
  disabled: { opacity: 0.5 },
  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signinText: { fontSize: 14, color: '#222' },
  orangeLink: { color: '#E86A33', fontWeight: '600', fontSize: 14 },
});