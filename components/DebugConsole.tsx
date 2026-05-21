import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useDebugStore } from '@/store/useDebugStore';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function DebugConsole() {
    const { logs, isVisible, toggleVisible, clearLogs } = useDebugStore();
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (isVisible) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [logs.length, isVisible]);

    const handleCopy = async () => {
        const text = logs.join('\n');
        await Clipboard.setStringAsync(text);
        alert('Logs copied to clipboard!');
    };

    if (!isVisible) return null;

    return (
        <Modal transparent animationType="slide" visible={isVisible}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Live Debug Console</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={clearLogs} style={styles.btn}>
                            <Ionicons name="trash-outline" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCopy} style={styles.btn}>
                            <Ionicons name="copy-outline" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleVisible} style={styles.btn}>
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.logArea}
                    contentContainerStyle={{ padding: 10 }}
                >
                    {logs.map((log, index) => {
                        const isError = log.includes('ERROR:');
                        const isWarn = log.includes('WARN:');
                        return (
                            <Text 
                                key={index} 
                                style={[
                                    styles.logText,
                                    isError && styles.errorText,
                                    isWarn && styles.warnText
                                ]}
                            >
                                {log}
                            </Text>
                        );
                    })}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Dimensions.get('window').height * 0.6,
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 9999,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#2D2D2D',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    title: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    btn: {
        padding: 4,
    },
    logArea: {
        flex: 1,
    },
    logText: {
        color: '#A9DC76', // Greenish for info
        fontFamily: 'monospace',
        fontSize: 11,
        marginBottom: 4,
    },
    errorText: {
        color: '#FF6188', // Red
    },
    warnText: {
        color: '#FFD866', // Yellow
    }
});
