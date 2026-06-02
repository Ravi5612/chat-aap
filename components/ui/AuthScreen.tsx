import React from 'react';
import {
    View,
    Text,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient 
            colors={['#0F172A', '#1E293B']} 
            style={{ flex: 1 }}
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
                        paddingBottom: 40,
                    }}>
                        <Text style={{ 
                            fontSize: 36, 
                            fontWeight: '900', 
                            color: '#FFFFFF',
                            letterSpacing: 2,
                        }}>
                            CHATWARRIOR<Text style={{ color: '#F68537' }}>.</Text>
                        </Text>
                    </View>

                {/* Scrollable Form Content */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        padding: 24,
                        paddingTop: 40,
                        borderTopLeftRadius: 40,
                        borderTopRightRadius: 40,
                        flex: 1,
                        gap: 16,
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
        </LinearGradient>
    );
}
