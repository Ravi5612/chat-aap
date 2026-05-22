import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF5E6' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="warning" size={40} color="#EF4444" />
        </View>
        
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, textAlign: 'center' }}>
          Oops! Something went wrong.
        </Text>
        
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
          Don't worry, your data is safe. We just hit a small bump. Let's try reloading the screen.
        </Text>
        
        <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, width: '100%', marginBottom: 32, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 12, color: '#EF4444', fontFamily: 'monospace' }}>
            {error?.message || 'Unknown error occurred'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={retry}
          style={{ backgroundColor: '#F68537', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center', shadowColor: '#F68537', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Reload Screen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
