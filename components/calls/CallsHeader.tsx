import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallsHeaderProps {
    isSelectionMode: boolean;
    selectedCount: number;
    onCancelSelection: () => void;
    onDeletePress: () => void;
    onNewCallPress?: () => void;
}

const CallsHeader = React.memo(({
    isSelectionMode,
    selectedCount,
    onCancelSelection,
    onDeletePress,
    onNewCallPress,
}: CallsHeaderProps) => {
    return (
        <View style={[
            styles.headerContainer,
            { backgroundColor: isSelectionMode ? '#F68537' : 'white' }
        ]}>
            {isSelectionMode ? (
                <>
                    <TouchableOpacity onPress={onCancelSelection}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.selectionText}>{selectedCount} Selected</Text>
                    <TouchableOpacity onPress={onDeletePress}>
                        <Ionicons name="trash-outline" size={24} color="white" />
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <Text style={styles.titleText}>Calls</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={onNewCallPress}>
                        <Ionicons name="call-outline" size={24} color="#F68537" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
});

export default CallsHeader;

const styles = StyleSheet.create({
    headerContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F68537',
    },
    iconButton: {
        backgroundColor: '#FFF7ED',
        padding: 8,
        borderRadius: 9999,
    }
});
