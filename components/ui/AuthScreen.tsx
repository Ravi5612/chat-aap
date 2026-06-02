import React from 'react';
import {
    View,
    Text,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatLoader from '@/components/ui/ChatLoader';

interface AuthScreenProps {
    title: string;
    subtitle: string;
    loading?: boolean;
    children: React.ReactNode;
}

export default function AuthScreen({ title, subtitle, loading = false, children }: AuthScreenProps) {
    return (
        <ImageBackground 
            source={require('@/assets/images/auth-bg.png')} 
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
                >
                    {/* Fixed Header - Title */}
                    <View style={{
                        alignItems: 'center',
                        paddingTop: 80,
                        paddingBottom: 30,
                    }}>
                        <Text style={{ fontSize: 24, marginBottom: -10, zIndex: 10 }}>🇮🇳</Text>
                        <Text style={{ 
                            fontSize: 48, 
                            fontWeight: '900', 
                            color: '#FFFFFF',
                            fontStyle: 'italic',
                            letterSpacing: 2,
                            textShadowColor: '#F68537',
                            textShadowOffset: { width: 2, height: 2 },
                            textShadowRadius: 1,
                        }}>
                            CHATWARRIOR
                        </Text>
                    </View>

                {/* Scrollable Form Content */}
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View style={{
                        backgroundColor: 'white',
                        padding: 24,
                        paddingTop: 32,
                        borderRadius: 30,
                        shadowColor: '#F68537',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 20,
                        elevation: 10,
                        gap: 16,
                        marginHorizontal: 12,
                    }}>
                        {/* Page Title & Subtitle inside card */}
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>
                            {title}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
                            {subtitle}
                        </Text>

                        {/* Dynamic content from each page */}
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {loading && <ChatLoader />}
            </SafeAreaView>
        </ImageBackground>
    );
}
