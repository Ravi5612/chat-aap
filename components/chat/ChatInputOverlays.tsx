import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditingBannerProps {
    editingMessage: any;
    onCancelEdit?: () => void;
}

export function EditingBanner({ editingMessage, onCancelEdit }: EditingBannerProps) {
    return (
        <View style={{
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: '#FFF7ED', borderBottomWidth: 1,
            borderBottomColor: 'rgba(246, 133, 55, 0.3)',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 4, height: 40, backgroundColor: '#F68537', borderRadius: 9999, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#F68537', fontWeight: 'bold', marginBottom: 2 }}>
                        Editing message...
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4B5563' }} numberOfLines={1}>
                        {editingMessage.message}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onCancelEdit} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
        </View>
    );
}

interface SelectedImagePreviewProps {
    imageUri: string;
    onRemove: () => void;
    isVideo?: boolean;
}

export function SelectedImagePreview({ imageUri, onRemove, isVideo }: SelectedImagePreviewProps) {
    const { Image, View: RNView, Text: RNText } = require('react-native');
    return (
        <RNView style={{
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: '#F9FAFB', borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center'
        }}>
            {isVideo ? (
                <RNView style={{ width: 64, height: 64, borderRadius: 8, marginRight: 16, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="play-circle" size={32} color="white" />
                </RNView>
            ) : (
                <Image source={{ uri: imageUri }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 16 }} />
            )}
            <TouchableOpacity
                onPress={onRemove}
                style={{ position: 'absolute', top: 4, left: 64, backgroundColor: '#EF4444', borderRadius: 9999 }}
            >
                <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
            <RNText style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>{isVideo ? 'Video selected' : 'Image selected'}</RNText>
        </RNView>
    );
}

interface NonMemberOverlayProps {}

export function NonMemberOverlay({}: NonMemberOverlayProps) {
    return (
        <View style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(249, 250, 251, 0.8)',
            zIndex: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20
        }}>
            <View style={{
                backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10,
                borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
                flexDirection: 'row', alignItems: 'center', gap: 8,
                elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1, shadowRadius: 4
            }}>
                <Text style={{ fontSize: 18 }}>🚫</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280' }}>
                    You are no longer a member of this group
                </Text>
            </View>
        </View>
    );
}
