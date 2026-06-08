import React, { memo } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, UIManager } from 'react-native';
import { useContactSuggestions } from '@/hooks/useContactSuggestions';
import { ComponentErrorBoundary } from '@/components/ui/ComponentErrorBoundary';

import { ContactRow } from './ContactRow';
import { ContactsPermissionCard, EmptyContactsCard } from './ContactCards';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ContactSuggestionsInner = memo(() => {
    const { suggestions, loading, permissionGranted, requestPermission, sendRequest, cancelRequest } = useContactSuggestions();

    if (permissionGranted === false) {
        return <ContactsPermissionCard requestPermission={requestPermission} />;
    }

    if (!loading && suggestions.length === 0) {
        return <EmptyContactsCard />;
    }

    if (loading && suggestions.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color="#F68537" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listWrapper}>
                <View style={styles.listView}>
                    {suggestions.map((user) => (
                        <ContactRow 
                            key={user.id} 
                            user={user} 
                            sendRequest={sendRequest} 
                            cancelRequest={cancelRequest} 
                        />
                    ))}
                </View>
            </View>
        </View>
    );
});

export default function ContactSuggestions() {
    return (
        <ComponentErrorBoundary fallbackName="Contact Suggestions">
            <ContactSuggestionsInner />
        </ComponentErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)'
    },
    listWrapper: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    listView: {
        paddingBottom: 8
    },
    loadingContainer: {
        padding: 16,
    }
});
