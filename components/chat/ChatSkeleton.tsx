import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatSkeletonProps {
    safeTop: number;
    safeBottom: number;
}

const ChatSkeleton = memo(({ safeTop, safeBottom }: ChatSkeletonProps) => {
    const bottomPadding = safeBottom > 0 ? safeBottom : 12;
    
    return (
        <View style={styles.container}>
            <View style={[styles.headerContainer, { paddingTop: safeTop }]}>
                <Ionicons name="chevron-back" size={28} color="#F68537" style={styles.backIcon} />
                <View style={styles.userInfoContainer}>
                    <View style={styles.avatarSkeleton} />
                    <View>
                        <View style={styles.nameSkeleton} />
                        <View style={styles.statusSkeleton} />
                    </View>
                </View>
            </View>
            <View style={styles.messagesContainer}>
                <View style={styles.receivedMessageSkeleton} />
                <View style={styles.sentMessageSkeleton} />
            </View>
            <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
                <View style={styles.inputContainer}>
                    <View style={styles.inputBubble}>
                        <View style={styles.inputIconSkeletonLeft} />
                        <View style={styles.inputTextSkeleton} />
                        <View style={styles.inputIconSkeletonRight} />
                    </View>
                    <View style={styles.sendButtonSkeleton} />
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EBD8B7',
    },
    headerContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    backIcon: {
        opacity: 0.5,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginLeft: 4,
    },
    avatarSkeleton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E2E8F0',
    },
    nameSkeleton: {
        width: 100,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 4,
    },
    statusSkeleton: {
        width: 60,
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    messagesContainer: {
        flex: 1,
        padding: 16,
    },
    receivedMessageSkeleton: {
        alignSelf: 'flex-start',
        width: '60%',
        height: 60,
        backgroundColor: 'white',
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        marginBottom: 16,
        opacity: 0.6,
    },
    sentMessageSkeleton: {
        alignSelf: 'flex-end',
        width: '50%',
        height: 45,
        backgroundColor: '#F68537',
        borderRadius: 20,
        borderBottomRightRadius: 4,
        marginBottom: 16,
        opacity: 0.3,
    },
    inputWrapper: {
        backgroundColor: 'transparent',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    inputBubble: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 25,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        elevation: 2,
    },
    inputIconSkeletonLeft: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E2E8F0',
        marginLeft: 8,
    },
    inputTextSkeleton: {
        flex: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginHorizontal: 12,
    },
    inputIconSkeletonRight: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E2E8F0',
        marginRight: 8,
    },
    sendButtonSkeleton: {
        height: 48,
        width: 48,
        borderRadius: 24,
        backgroundColor: '#F68537',
        opacity: 0.8,
    },
});

export default ChatSkeleton;

