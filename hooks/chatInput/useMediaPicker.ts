import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const useMediaPicker = (setSelectedImage: (uri: string | null) => void) => {
    const launchImagePicker = async (shouldCrop: boolean) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: shouldCrop,
                quality: 0.7,
            });

            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('ChatInput PickImage Error:', error);
            Alert.alert('Error', 'Failed to open gallery');
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow gallery access to share photos.');
                return;
            }

            Alert.alert(
                'Crop Image?',
                'Do you want to crop the image before sending?',
                [
                    { text: 'No (Fast send)', onPress: () => launchImagePicker(false) },
                    { text: 'Yes (Crop it)', onPress: () => launchImagePicker(true) },
                    { text: 'Cancel', style: 'cancel' }
                ],
                { cancelable: true }
            );
        } catch (error) {
            console.error('ChatInput PickImage Error:', error);
        }
    };

    const launchCamera = async (shouldCrop: boolean) => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: shouldCrop,
                quality: 0.7,
            });

            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('ChatInput LaunchCamera Error:', error);
            Alert.alert('Error', 'Failed to open camera');
        }
    };

    const handleLaunchCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow camera access to take photos.');
                return;
            }
            // Directly open camera without asking to crop
            launchCamera(false);
        } catch (error) {
            console.error('ChatInput LaunchCamera Error:', error);
        }
    };

    return { handlePickImage, handleLaunchCamera };
};
