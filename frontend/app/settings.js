import { useAuth, useUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { deleteUserAccount, getUser, uploadAvatarImage, upsertUser } from '../utils/flavorProfileApi';

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const monoFont = Platform.select({ ios: 'Courier', android: 'monospace' });

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { signOut } = useAuth();
    const { user } = useUser();

    const { data: dbUser } = useQuery({
        queryKey: ['dbUser', user?.id],
        queryFn: () => getUser(user.id),
        enabled: !!user?.id,
    });

    const [displayName, setDisplayName] = useState(
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || dbUser?.display_name || user?.fullName || 'Food Explorer'
    );
    const [username, setUsername] = useState(
        user?.username || dbUser?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'explorer'
    );
    const [bio, setBio] = useState(
        dbUser?.bio || 'Chasing fermentation across the globe. Seeking the perfect balance of acid and fat.'
    );
    const [avatarUrl, setAvatarUrl] = useState(
        dbUser?.avatar_url || user?.imageUrl || 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=400&q=80'
    );
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (dbUser) {
            if (dbUser.display_name) setDisplayName(dbUser.display_name);
            if (dbUser.username) setUsername(dbUser.username);
            if (dbUser.bio) setBio(dbUser.bio);
            if (dbUser.avatar_url) setAvatarUrl(dbUser.avatar_url);
        } else if (user) {
            const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.fullName;
            if (fullName) setDisplayName(fullName);
            if (user.username) setUsername(user.username);
            if (user.imageUrl && !dbUser?.avatar_url) setAvatarUrl(user.imageUrl);
        }
    }, [dbUser, user]);

    const onChangeAvatar = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Permission to access media library is required to pick an avatar.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                const pickedUri = result.assets[0].uri;
                setAvatarUrl(pickedUri);
            }
        } catch (error) {
            console.error('Avatar selection error:', error);
            Alert.alert('Error', 'Failed to select image.');
        }
    };

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

    const onDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to permanently delete your account? All your flavor profiles, dish logs, and reviews will be permanently removed. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            if (user?.id) {
                                await deleteUserAccount(user.id).catch((err) => {
                                    console.warn('Backend user deletion warning:', err);
                                });
                                if (user.delete) {
                                    await user.delete();
                                }
                            }
                            await signOut();
                            router.replace('/');
                        } catch (error) {
                            console.error('Account deletion error:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const onSaveChanges = async () => {
        if (!user?.id) return;
        try {
            setIsSaving(true);
            const cleanDisplayName = displayName.trim();
            const cleanUsername = username.trim().replace(/^@/, '');
            
            // 1. Upload local avatar image to S3 if it's a local file URI
            let finalAvatarUrl = avatarUrl;
            if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
                try {
                    finalAvatarUrl = await uploadAvatarImage(avatarUrl);
                    setAvatarUrl(finalAvatarUrl);
                } catch (uploadErr) {
                    console.warn('Avatar upload error:', uploadErr);
                }
            }

            // 2. Update backend database
            await upsertUser(user.id, {
                bio: bio.trim(),
                display_name: cleanDisplayName || null,
                username: cleanUsername || null,
                avatar_url: finalAvatarUrl || null,
            });

            // 3. Try updating Clerk user profile if available
            if (user.update) {
                const nameParts = cleanDisplayName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                try {
                    await user.update({
                        firstName: firstName || user.firstName,
                        lastName: lastName || user.lastName,
                        username: cleanUsername || user.username,
                    });
                } catch (clerkErr) {
                    console.warn('Clerk user update notice:', clerkErr);
                }
            }

            await queryClient.invalidateQueries(['dbUser', user.id]);
            Alert.alert('Saved', 'Your profile and avatar photo have been saved!');
        } catch (error) {
            console.error('Save profile error:', error);
            Alert.alert('Error', 'Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
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
                    <TouchableOpacity onPress={onChangeAvatar} style={styles.avatarContainer}>
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>{displayName}</Text>
                        <Text style={styles.handle}>@{username.replace(/^@/, '')}</Text>
                        <TouchableOpacity onPress={onChangeAvatar}>
                            <Text style={styles.changeAvatar}>CHANGE AVATAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Edit Display Name */}
                <Text style={styles.sectionLabel}>Display Name</Text>
                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    style={styles.singleInput}
                    placeholder="Enter display name"
                    placeholderTextColor="#aaa"
                />

                {/* Edit Username */}
                <Text style={styles.sectionLabel}>Username</Text>
                <TextInput
                    value={username}
                    onChangeText={setUsername}
                    style={styles.singleInput}
                    placeholder="Enter username"
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                />

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
                    <TouchableOpacity onPress={onSaveChanges} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#E86A33" />
                        ) : (
                            <Text style={styles.saveChangesActive}>Save changes</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Danger Zone: Delete Account */}
                <TouchableOpacity
                    onPress={onDeleteAccount}
                    disabled={isDeleting}
                    style={styles.deleteAccountButton}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#D32F2F" size="small" />
                    ) : (
                        <Text style={styles.deleteAccountText}>Delete Account</Text>
                    )}
                </TouchableOpacity>
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
    singleInput: {
        borderWidth: 1,
        borderColor: '#E0DDD5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#FAFAF7',
        color: '#444',
        fontSize: 14,
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
    saveChangesActive: {
        color: '#E86A33',
        fontSize: 15,
        fontWeight: '600',
    },
    deleteAccountButton: {
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    deleteAccountText: {
        color: '#D32F2F',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
