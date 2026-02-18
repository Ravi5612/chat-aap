import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';

export default function EditProfileScreen() {
    const router = useRouter();
    const { profile, updateProfile, syncProfile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        username: profile?.username || '',
        phone: profile?.phone || '',
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || '',
        show_email: profile?.show_email ?? false,
        show_phone: profile?.show_phone ?? false,
        show_bio: profile?.show_bio ?? true,
        is_online: profile?.is_online ?? true,
        allow_status_download: profile?.allow_status_download ?? false
    });

    useEffect(() => {
        syncProfile();
    }, []);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                await uploadImage(result.assets[0]);
            }
        } catch (error) {
            console.error('Pick image error:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploadingImage(true);
        try {
            const userId = profile?.id;
            if (!userId) throw new Error("User not found");

            const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Convert base64 to ArrayBuffer for Supabase upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, Buffer.from(asset.base64!, 'base64'), {
                    contentType: asset.mimeType || 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

            // Immediately update profile in DB for avatar
            await updateProfile({ avatar_url: publicUrl });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile picture updated! 📸');
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', error.message || 'Could not upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!formData.username.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Remove full_name since it doesn't exist in the profiles table based on PGRST204 error
        const success = await updateProfile({
            username: formData.username,
            phone: formData.phone,
            bio: formData.bio,
            show_email: formData.show_email,
            show_phone: formData.show_phone,
            show_bio: formData.show_bio,
            is_online: formData.is_online,
            allow_status_download: formData.allow_status_download
        });

        if (success) {
            Alert.alert('Success', 'Profile updated successfully! ✅');
            router.back();
        } else {
            Alert.alert('Error', 'Failed to update profile details. Please check your connection.');
        }
        setLoading(false);
    };

    const toggleSwitch = (key: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFormData(prev => ({ ...prev, [key]: !prev[key as keyof typeof formData] }));
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFF5E6' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                        <Ionicons name="close" size={28} color="#374151" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937' }}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={loading || uploadingImage} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                        {loading ? <ActivityIndicator size="small" color="#F68537" /> : <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 16 }}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Avatar Upload */}
                    <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: 'white', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                        <TouchableOpacity onPress={pickImage} disabled={uploadingImage} style={{ position: 'relative' }}>
                            <Image
                                source={formData.avatar_url ? { uri: formData.avatar_url } : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.username || 'User')}&backgroundColor=F68537`}
                                style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: '#F3F4F6', borderWidth: 4, borderColor: '#FFF' }}
                            />
                            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F68537', padding: 12, borderRadius: 9999, borderWidth: 4, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Ionicons name="camera" size={22} color="white" />
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 14, fontWeight: '500' }}>{uploadingImage ? 'Uploading Image...' : 'Change Profile Photo'}</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={{ padding: 20, gap: 24 }}>
                        {/* Display Name Field */}
                        <View>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>Display Name / Username</Text>
                            <TextInput
                                style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16, color: '#1F2937' }}
                                value={formData.username}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
                                placeholder="What should we call you?"
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Phone Field */}
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase' }}>Phone Number</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Visible to friends</Text>
                                    <Switch
                                        value={formData.show_phone}
                                        onValueChange={() => toggleSwitch('show_phone')}
                                        trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                                        thumbColor={formData.show_phone ? '#F68537' : '#FFFFFF'}
                                        style={{ transform: [{ scale: 0.8 }] }}
                                    />
                                </View>
                            </View>
                            <TextInput
                                style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16, color: '#1F2937' }}
                                value={formData.phone}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                                placeholder="Optional"
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Bio Field */}
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase' }}>Bio / About Me</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Visible to friends</Text>
                                    <Switch
                                        value={formData.show_bio}
                                        onValueChange={() => toggleSwitch('show_bio')}
                                        trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                                        thumbColor={formData.show_bio ? '#F68537' : '#FFFFFF'}
                                        style={{ transform: [{ scale: 0.8 }] }}
                                    />
                                </View>
                            </View>
                            <TextInput
                                style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 16, color: '#1F2937', height: 100 }}
                                value={formData.bio}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                                placeholder="Talk about yourself..."
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Other Privacy Settings */}
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 4 }}>Privacy & Visibility</Text>

                            <View style={{ backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
                                {/* Show Email */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                                    <View style={{ backgroundColor: '#FFF7ED', padding: 10, borderRadius: 12, marginRight: 16 }}>
                                        <Ionicons name="mail-outline" size={22} color="#F68537" />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 16, color: '#374151', fontWeight: '600' }}>Show Email to Friends</Text>
                                    <Switch
                                        value={formData.show_email}
                                        onValueChange={() => toggleSwitch('show_email')}
                                        trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                                        thumbColor={formData.show_email ? '#F68537' : '#FFFFFF'}
                                    />
                                </View>

                                {/* Online Status */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
                                    <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12, marginRight: 16 }}>
                                        <Ionicons name="radio-outline" size={22} color="#10B981" />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 16, color: '#374151', fontWeight: '600' }}>Show Online Status</Text>
                                    <Switch
                                        value={formData.is_online}
                                        onValueChange={() => toggleSwitch('is_online')}
                                        trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                                        thumbColor={formData.is_online ? '#F68537' : '#FFFFFF'}
                                    />
                                </View>

                                {/* Status Download */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                                    <View style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 12, marginRight: 16 }}>
                                        <Ionicons name="download-outline" size={22} color="#F59E0B" />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 16, color: '#374151', fontWeight: '600' }}>Allow Status Download</Text>
                                    <Switch
                                        value={formData.allow_status_download}
                                        onValueChange={() => toggleSwitch('allow_status_download')}
                                        trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                                        thumbColor={formData.allow_status_download ? '#F68537' : '#FFFFFF'}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
