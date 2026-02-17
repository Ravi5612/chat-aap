import { View, Text, TextInput, TouchableOpacity, FlatList, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore } from '@/store/useFriendsStore';
import * as ImagePicker from 'expo-image-picker';
import { uploadGroupAvatar } from '@/utils/uploadHelper';

export default function NewGroupScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialMemberId = params.initialMemberId as string;

    const { user: currentUser } = useAuthStore();
    const { friends, loadFriends } = useFriendsStore();

    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set(initialMemberId ? [initialMemberId] : []));
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (currentUser?.id) {
            loadFriends(currentUser.id);
        }
    }, [currentUser]);

    const toggleSelection = (friendId: string) => {
        const newSelection = new Set(selectedFriends);
        if (newSelection.has(friendId)) {
            newSelection.delete(friendId);
        } else {
            newSelection.add(friendId);
        }
        setSelectedFriends(newSelection);
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }
        if (selectedFriends.size === 0) {
            Alert.alert('Error', 'Please select at least one member');
            return;
        }

        setCreating(true);
        try {
            let uploadedAvatarUrl = null;
            if (avatarUri) {
                const { url } = await uploadGroupAvatar(avatarUri);
                uploadedAvatarUrl = url;
            }

            // 1. Create Group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert([{
                    name: groupName.trim(),
                    avatar_url: uploadedAvatarUrl,
                    created_by: currentUser.id
                }])
                .select()
                .single();

            if (groupError) throw groupError;

            // 2. Add Members (Admin + Selected)
            const members = [currentUser.id, ...Array.from(selectedFriends)].map(uid => ({
                group_id: group.id,
                user_id: uid,
                role: uid === currentUser.id ? 'admin' : 'member'
            }));

            const { error: membersError } = await supabase
                .from('group_members')
                .insert(members);

            if (membersError) throw membersError;

            // 3. Send System Message
            await supabase.from('messages').insert({
                group_id: group.id,
                sender_id: currentUser.id,
                message: 'SYSTEM_MSG: Group created',
                status: 'sent'
            });

            Alert.alert('Success', 'Group created successfully! 🎉');
            router.replace('/(tabs)');

            // Reload to show new group
            loadFriends(currentUser.id);

        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCreating(false);
        }
    };

    const renderFriend = ({ item }: { item: any }) => {
        if (item.isGroup) return null; // Don't show groups in selection
        const isSelected = selectedFriends.has(item.id);

        return (
            <TouchableOpacity
                onPress={() => toggleSelection(item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
            >
                <Image
                    source={{ uri: item.img }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{item.email}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? '#F68537' : '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#F68537' : 'transparent' }}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#4B5563" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>New Group</Text>
                <TouchableOpacity onPress={handleCreateGroup} disabled={creating}>
                    {creating ? <ActivityIndicator color="#F68537" /> : <Text style={{ color: '#F68537', fontWeight: 'bold', fontSize: 16 }}>Create</Text>}
                </TouchableOpacity>
            </View>

            {/* Group Details */}
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#F9FAFB' }}>
                <TouchableOpacity onPress={handlePickImage} style={{ marginBottom: 16 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80 }} />
                        ) : (
                            <Ionicons name="camera" size={32} color="#9CA3AF" />
                        )}
                    </View>
                </TouchableOpacity>
                <TextInput
                    placeholder="Group Name"
                    value={groupName}
                    onChangeText={setGroupName}
                    style={{ fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#D1D5DB', width: '80%', textAlign: 'center', paddingVertical: 8 }}
                />
            </View>

            {/* Members List */}
            <View style={{ flex: 1 }}>
                <Text style={{ padding: 16, color: '#6B7280', fontWeight: '600', backgroundColor: '#F3F4F6' }}>SELECT MEMBERS</Text>
                <FlatList
                    data={friends.filter(f => !f.isGroup)}
                    keyExtractor={item => item.id}
                    renderItem={renderFriend}
                />
            </View>
        </SafeAreaView>
    );
}
