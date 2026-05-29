import { useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { Buffer } from 'buffer';

export const useToneUploader = (user: any, updateProfile: (updates: any) => Promise<boolean>) => {
    const [saving, setSaving] = useState(false);

    const handleSave = async (type: 'message' | 'call', url: string) => {
        setSaving(true);
        try {
            const updates = type === 'message' ? { message_tone: url } : { call_tone: url };
            const success = await updateProfile(updates);
            if (!success) throw new Error('Failed to save');
        } catch (error) {
            console.error('Error saving tone:', error);
            Alert.alert('Error', 'Failed to update tone.');
        } finally {
            setSaving(false);
        }
    };

    const pickAndUploadTone = async (type: 'message' | 'call', oldUrl?: string) => {
        try {
            if (!user?.id) {
                Alert.alert('Error', 'User session not found.');
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            setSaving(true);
            const asset = result.assets[0];
            
            // No need for base64 conversion with Cloudinary FormData
            const fileName = `tone_${type}_${user.id}`;

            const formData = new FormData();
            formData.append('file', { uri: asset.uri, type: asset.mimeType || 'audio/mpeg', name: fileName + '.mp3' } as any);
            formData.append('upload_preset', 'lrkgj8fj');
            formData.append('public_id', fileName);

            // Use auto/upload to let Cloudinary figure out the resource_type (audio/video)
            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/do6lyfmn4/auto/upload`, {
                method: 'POST',
                body: formData
            });

            const cloudData = await cloudRes.json();
            
            if (cloudData.error) {
                throw new Error(cloudData.error.message || 'Cloudinary upload failed');
            }

            // Append timestamp to break local cache since public_id is reused
            const publicUrl = `${cloudData.secure_url}?t=${Date.now()}`;

            await handleSave(type, publicUrl);
            Alert.alert('Success', 'Custom tone uploaded and set!');
        } catch (error: any) {
            console.error('Error uploading custom tone:', error);
            Alert.alert('Error', error.message || 'Failed to upload custom tone.');
        } finally {
            setSaving(false);
        }
    };

    return {
        saving,
        handleSave,
        pickAndUploadTone
    };
};
