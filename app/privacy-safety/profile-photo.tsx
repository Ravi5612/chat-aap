import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import FriendSelectorModal from '@/components/profile/FriendSelectorModal';
import { DP_Privacy } from '@/utils/privacyHelper';

export default function ProfilePhotoPrivacyScreen() {
    const router = useRouter();
    const { profile, updateProfile } = useAuthStore();
    
    // Local state for instant UI updates
    const [privacy, setPrivacy] = useState<DP_Privacy>(profile?.dp_privacy || 'everyone');
    const [hideInSearch, setHideInSearch] = useState<boolean>(profile?.hide_dp_in_search || false);
    const [selectedFriends, setSelectedFriends] = useState<string[]>(profile?.dp_selected_friends || []);
    
    const [isSelectorVisible, setIsSelectorVisible] = useState(false);

    const handlePrivacyChange = async (newPrivacy: DP_Privacy) => {
        setPrivacy(newPrivacy);
        if (newPrivacy !== 'selected') {
            await updateProfile({ dp_privacy: newPrivacy });
        } else {
            setIsSelectorVisible(true);
        }
    };

    const handleFriendsSelected = async (friendIds: string[]) => {
        setSelectedFriends(friendIds);
        setPrivacy('selected');
        await updateProfile({ 
            dp_privacy: 'selected', 
            dp_selected_friends: friendIds 
        });
    };

    const toggleHideInSearch = async (value: boolean) => {
        setHideInSearch(value);
        await updateProfile({ hide_dp_in_search: value });
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile Photo</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
                    <Text style={styles.sectionLabel}>WHO CAN SEE MY PROFILE PHOTO</Text>

                    <View style={styles.card}>
                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('everyone')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Everyone</Text>
                                <Text style={styles.optionDesc}>Anyone on ChatWarriors can see your photo</Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'everyone' && styles.radioSelected]}>
                                {privacy === 'everyone' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('friends')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>My Friends</Text>
                                <Text style={styles.optionDesc}>Only your approved friends can see your photo</Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'friends' && styles.radioSelected]}>
                                {privacy === 'friends' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.radioOption} onPress={() => handlePrivacyChange('selected')}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Selected Friends...</Text>
                                <Text style={styles.optionDesc}>
                                    {privacy === 'selected' && selectedFriends.length > 0 
                                        ? `${selectedFriends.length} friends selected` 
                                        : 'Choose specific friends who can see your photo'}
                                </Text>
                            </View>
                            <View style={[styles.radioCircle, privacy === 'selected' && styles.radioSelected]}>
                                {privacy === 'selected' && <View style={styles.radioInner} />}
                            </View>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DISCOVERY & SEARCH</Text>

                    <View style={styles.card}>
                        <View style={styles.switchOption}>
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <Text style={styles.optionTitle}>Hide in Search & Suggestions</Text>
                                <Text style={styles.optionDesc}>When non-friends find you in global search or suggestions, your photo will be hidden (even if set to Everyone).</Text>
                            </View>
                            <Switch
                                value={hideInSearch}
                                onValueChange={toggleHideInSearch}
                                trackColor={{ false: '#E5E7EB', true: '#FFEDD5' }}
                                thumbColor={hideInSearch ? '#F68537' : '#FFFFFF'}
                            />
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>

            <FriendSelectorModal
                visible={isSelectorVisible}
                onClose={() => {
                    setIsSelectorVisible(false);
                    if (privacy === 'selected' && selectedFriends.length === 0) {
                        // Revert if they didn't select anyone
                        handlePrivacyChange(profile?.dp_privacy || 'everyone');
                    }
                }}
                onSave={handleFriendsSelected}
                initialSelectedIds={selectedFriends}
                title="Select Viewers"
                subtitle="Only selected friends will see your photo"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFDFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 12,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    switchOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 16,
    },
    radioCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },
    radioSelected: {
        borderColor: '#F68537',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F68537',
    }
});

export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';
