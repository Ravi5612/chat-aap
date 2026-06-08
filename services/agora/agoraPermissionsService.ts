import { Platform, PermissionsAndroid } from 'react-native';

export const requestAgoraPermissions = async (callType: 'audio' | 'video'): Promise<boolean> => {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        
        if (granted['android.permission.RECORD_AUDIO'] !== 'granted' || 
            (callType === 'video' && granted['android.permission.CAMERA'] !== 'granted')) {
            return false;
        }
    }
    return true;
};
