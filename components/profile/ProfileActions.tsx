import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ProfileActionsProps {
    onShare: () => void;
}

export default function ProfileActions({ onShare }: ProfileActionsProps) {
    const router = useRouter();

    return (
        <View style={styles.actionsContainer}>
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push('/edit-profile')}
            >
                <LinearGradient
                    colors={['#F68537', '#FF9D5C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.editButton}
                >
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                <Ionicons name="share-social-outline" size={24} color="#F68537" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginTop: 24,
        gap: 12,
    },
    editButton: {
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareButton: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#FFF9F1',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFF1E0',
    },
});
