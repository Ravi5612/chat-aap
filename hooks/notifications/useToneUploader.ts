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

    const pickAndUploadTone = async (type: 'message' | 'call') => {
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
            
            // Read file as base64
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const reader = new FileReader();
            
            const fileData: any = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const base64 = fileData.split(',')[1];
            const fileName = `${user.id}/${Date.now()}_${asset.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const filePath = `tones/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(filePath, Buffer.from(base64, 'base64'), {
                    contentType: asset.mimeType || 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-files')
                .getPublicUrl(filePath);

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
