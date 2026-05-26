import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export const useDocumentPicker = (onSendMessage: (text: string) => void) => {
    const handleDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', // allow all files, including .apk
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (!asset) return;

            const name = asset.name || 'file';
            const uri = asset.uri;
            const mimeType = asset.mimeType || 'application/octet-stream';

            onSendMessage(`[Document] ${uri} | ${name} | ${mimeType}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to pick document.');
        }
    };

    return { handleDocument };
};
