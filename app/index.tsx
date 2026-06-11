import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { View} from 'react-native';
import { Image } from 'expo-image';
import React from 'react';

export default function Index() {
    const session = useAuthStore(state => state.session);
    const initializing = useAuthStore(state => state.initializing);

    // If still initializing, show the Custom Logo to prevent a blank screen
    if (initializing) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Image source={require('../assets/images/logo.png')} style={{ width: 150, height: 150, resizeMode: 'contain' }}  cachePolicy="memory-disk" />
            </View>
        );
    }

    if (session) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/login" />;
}
