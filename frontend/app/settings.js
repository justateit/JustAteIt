import { useAuth } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });

export default function SettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuth();

    const [bio, setBio] = useState(
        'Chasing fermentation across the globe. Seeking the perfect balance of acid and fat.'
    );
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);

    const onLogOut = async () => {
        Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    router.replace('/');
                },
            },
        ]);
    };

    const onSaveChanges = () => {
        // TODO: persist bio/settings to backend
        Alert.alert('Saved', 'Your changes have been saved.');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
                {/* Avatar + Name */}
                <View style={styles.profileRow}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=400&q=80' }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>Julienne Bruno</Text>
                        <Text style={styles.handle}>@julienne</Text>
                        <TouchableOpacity>
                            <Text style={styles.changeAvatar}>CHANGE AVATAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Edit Bio */}
                <Text style={styles.sectionLabel}>Edit Bio</Text>
                <TextInput
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    style={styles.bioInput}
                    placeholderTextColor="#aaa"
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* Dark Mode Toggle */}
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Dark Mode</Text>
                        <Text style={styles.settingSubLabel}>Adjust the interface appearance</Text>
                    </View>
                    <Switch
                        value={darkMode}
                        onValueChange={setDarkMode}
                        trackColor={{ false: '#D9D9D9', true: '#E86A33' }}
                        thumbColor="#fff"
                        ios_backgroundColor="#D9D9D9"
                    />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Notifications Toggle */}
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Notifications</Text>
                        <Text style={styles.settingSubLabel}>Receive weekly flavor reports</Text>
                    </View>
                    <Switch
                        value={notifications}
                        onValueChange={setNotifications}
                        trackColor={{ false: '#D9D9D9', true: '#E86A33' }}
                        thumbColor="#fff"
                        ios_backgroundColor="#D9D9D9"
                    />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Footer Actions */}
                <View style={styles.footerRow}>
                    <TouchableOpacity onPress={onLogOut}>
                        <Text style={styles.logOut}>Log out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onSaveChanges}>
                        <Text style={styles.saveChanges}>Save changes</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F0E6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 12,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: serifFont,
        fontSize: 28,
        color: '#000',
    },
    card: {
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },
    avatarContainer: {
        padding: 3,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#E86A33',
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    profileInfo: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontFamily: serifFont,
        fontSize: 22,
        color: '#000',
        marginBottom: 2,
    },
    handle: {
        fontFamily: monoFont,
        fontSize: 13,
        color: '#888',
        marginBottom: 6,
    },
    changeAvatar: {
        color: '#E86A33',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    sectionLabel: {
        fontSize: 14,
        color: '#222',
        fontWeight: '500',
        marginBottom: 8,
    },
    bioInput: {
        borderWidth: 1,
        borderColor: '#E0DDD5',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#FAFAF7',
        color: '#444',
        fontSize: 14,
        lineHeight: 20,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0EDE5',
        marginVertical: 12,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    settingLabel: {
        fontSize: 15,
        color: '#111',
        fontWeight: '500',
        marginBottom: 2,
    },
    settingSubLabel: {
        fontSize: 12,
        color: '#999',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    logOut: {
        color: '#E86A33',
        fontSize: 15,
        fontWeight: '600',
    },
    saveChanges: {
        color: '#C0BAB0',
        fontSize: 15,
        fontWeight: '500',
    },
});
