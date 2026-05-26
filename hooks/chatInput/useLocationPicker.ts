import { Alert } from 'react-native';
import * as Location from 'expo-location';

export const useLocationPicker = (onSendMessage: (text: string) => void) => {
    const handleLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to share your location.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            let addressStr = 'Current Location';

            try {
                const [geocode] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (geocode) {
                    const parts = [
                        geocode.name,
                        geocode.street,
                        geocode.city || geocode.subregion,
                        geocode.region
                    ].filter(Boolean);

                    if (parts.length > 0) {
                        addressStr = parts.join(', ');
                    }
                }
            } catch (geocodeError) {
                console.log('Reverse geocode failed:', geocodeError);
            }

            onSendMessage(`[Location] ${location.coords.latitude},${location.coords.longitude} | ${addressStr}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to get location. Please try again.');
        }
    };

    return { handleLocation };
};
