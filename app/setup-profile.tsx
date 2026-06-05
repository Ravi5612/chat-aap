import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AuthScreen from '@/components/ui/AuthScreen';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';

export default function SetupProfilePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        if (!gender) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please select your gender');
            return;
        }

        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update({ 
                    username: name.trim(),
                    gender: gender
                })
                .eq('id', user.id);

            if (error) throw error;

            useAuthStore.setState((state) => ({
                profile: { ...state.profile, username: name.trim(), gender: gender }
            }));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    };

    return (
        <View style={{ flex: 1 }}>
            <AuthScreen 
                title="Profile Info" 
                subtitle="Complete your profile to join the battle!" 
                loading={loading}
            >
                <View style={{ gap: 20 }}>
                    <View>
                        <Text style={styles.label}>Your Name</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color="#F68537" style={styles.iconLeft} />
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Type your name here"
                                style={inputStyle}
                                editable={!loading}
                                placeholderTextColor="#9CA3AF"
                                autoFocus
                            />
                        </View>
                        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: -10, marginBottom: 6, paddingLeft: 12 }}>
                            This name will be visible to your contacts.
                        </Text>
                    </View>

                    {/* Gender Selection Section */}
                    <View>
                        <Text style={styles.label}>Select Gender</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            {[
                                { label: 'Male', value: 'male', icon: 'male', color: '#3B82F6', bg: '#EFF6FF' },
                                { label: 'Female', value: 'female', icon: 'female', color: '#EC4899', bg: '#FDF2F8' },
                                { label: 'Other', value: 'other', icon: 'person', color: '#8B5CF6', bg: '#F5F3FF' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setGender(option.value as any);
                                    }}
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        paddingVertical: 14,
                                        borderRadius: 16,
                                        borderWidth: 2,
                                        borderColor: gender === option.value ? option.color : '#E5E7EB',
                                        backgroundColor: gender === option.value ? option.bg : 'white',
                                    }}
                                >
                                    <Ionicons name={option.icon as any} size={22} color={gender === option.value ? option.color : '#9CA3AF'} />
                                    <Text style={{
                                        marginTop: 4,
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        color: gender === option.value ? option.color : '#9CA3AF'
                                    }}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleSaveProfile}
                        disabled={loading}
                        style={styles.actionButton}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.actionButtonText}>Next</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </AuthScreen>
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        color: '#F68537',
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
        paddingLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#F68537',
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 50,
    },
    iconLeft: {
        marginRight: 10,
    },
    actionButton: {
        width: '100%',
        backgroundColor: '#F68537',
        paddingVertical: 18,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#F68537',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
