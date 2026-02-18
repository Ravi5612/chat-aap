import React from 'react';
import {
    View,
    Text,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF5E6' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
            >
                {/* Fixed Header - Logo + Title */}
                <View style={{
                    alignItems: 'center',
                    paddingTop: 24,
                    paddingBottom: 16,
                    backgroundColor: '#FFF5E6',
                }}>
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={{ width: 90, height: 90, marginBottom: 8 }}
                        resizeMode="contain"
                    />
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#F68537' }}>Chat Warrior</Text>
                    <Text style={{ color: '#6B7280', marginTop: 4, fontSize: 14 }}>{subtitle}</Text>
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
                        borderRadius: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8,
                        gap: 16,
                    }}>
                        {/* Page Title inside card */}
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937', textAlign: 'center' }}>
                            {title}
                        </Text>

                        {/* Dynamic content from each page */}
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {loading && <ChatLoader />}
        </SafeAreaView>
    );
}
