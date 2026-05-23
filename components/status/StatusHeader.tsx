import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface StatusHeaderProps {
    insetsTop: number;
    privacy: 'all' | 'selected';
    selectedViewerCount: number;
    setShowPrivacyModal: (v: boolean) => void;
    selectedMedia: any;
    pickMedia: () => void;
    handlePost: () => void;
    loading: boolean;
    content: string;
    bgColor: string;
    onDeleteMedia: () => void;
}

export default function StatusHeader({
    insetsTop,
    privacy,
    selectedViewerCount,
    setShowPrivacyModal,
    selectedMedia,
    pickMedia,
    handlePost,
    loading,
    content,
    bgColor,
    onDeleteMedia
}: StatusHeaderProps) {
    const router = useRouter();

    return (
        <View style={{
            paddingTop: insetsTop + 10,
            paddingHorizontal: 20,
            paddingBottom: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
            backgroundColor: selectedMedia ? 'rgba(0,0,0,0.3)' : 'transparent'
        }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
                <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                    onPress={() => setShowPrivacyModal(true)}
                    style={[styles.headerIconButton, { width: 'auto', paddingHorizontal: 12, gap: 6, flexDirection: 'row' }]}
                >
                    <Ionicons name={privacy === 'all' ? "people-outline" : "person-add-outline"} size={20} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                        {privacy === 'all' ? 'All Friends' : `${selectedViewerCount} Selected`}
                    </Text>
                </TouchableOpacity>

                {!selectedMedia && (
                    <TouchableOpacity onPress={pickMedia} style={styles.headerIconButton}>
                        <Ionicons name="images-outline" size={24} color="white" />
                    </TouchableOpacity>
                )}

                {!selectedMedia && (
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={loading || (!content.trim() && !selectedMedia)}
                        style={[styles.postButton, { opacity: (!content.trim() || loading) ? 0.6 : 1 }]}
                    >
                        {loading ? (
                            <ActivityIndicator color={bgColor} size="small" />
                        ) : (
                            <Text style={[styles.postButtonText, { color: bgColor }]}>Post</Text>
                        )}
                    </TouchableOpacity>
                )}

                {selectedMedia && (
                    <TouchableOpacity onPress={onDeleteMedia} style={styles.headerIconButton}>
                        <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    postButton: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        justifyContent: 'center'
    },
    postButtonText: {
        fontWeight: 'bold',
        fontSize: 14
    }
});
