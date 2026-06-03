import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CallLog } from '@/hooks/useCallLogs';

// Simple date formatter
const simpleFormatDistance = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

// Simple duration formatter
const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
};

interface CallLogItemProps {
    item: CallLog;
    currentUser: any;
    isSelected: boolean;
    isSelectionMode: boolean;
    onToggleSelection: (id: string) => void;
    onLongPress: (id: string) => void;
    onChatPress: (userId: string, userName: string, userImg?: string) => void;
}

const CallLogItem = memo(function CallLogItem({
    item,
    currentUser,
    isSelected,
    isSelectionMode,
    onToggleSelection,
    onLongPress,
    onChatPress,
}: CallLogItemProps) {
    const isOutgoing = item.caller_id === currentUser?.id;
    const otherUser = isOutgoing ? item.receiver : item.caller;
    const displayName = otherUser?.username || 'Unknown User';
    const displayImg = otherUser?.avatar_url;

    // Determine icon and color based on call status
    let statusIconName: keyof typeof Ionicons.glyphMap = 'call';
    let statusColor = '#6B7280'; // gray

    if (item.status === 'missed') {
        statusIconName = 'close-circle';
        statusColor = '#EF4444'; // red
    } else if (isOutgoing) {
        statusIconName = 'arrow-up-circle';
        statusColor = '#3B82F6'; // blue
    } else {
        statusIconName = 'arrow-down-circle';
        statusColor = '#10B981'; // green
    }

    const typeIconName = item.call_type === 'video' ? 'videocam' : 'call';
    const durationStr = item.status !== 'missed' && item.duration > 0 ? ` (${formatDuration(item.duration)})` : '';

    return (
        <TouchableOpacity
            onPress={() => isSelectionMode ? onToggleSelection(item.id) : otherUser && onChatPress(otherUser.id, displayName, displayImg)}
            onLongPress={() => onLongPress(item.id)}
            delayLongPress={400}
            style={[
                styles.container,
                { backgroundColor: isSelected ? '#FFF7ED' : 'white' }
            ]}
        >
            {isSelectionMode && (
                <View style={styles.checkboxContainer}>
                    <Ionicons 
                        name={isSelected ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={isSelected ? "#F68537" : "#D1D5DB"} 
                    />
                </View>
            )}
            
            <View style={styles.avatarContainer}>
                {displayImg ? (
                    <Image
                        source={displayImg}
                        style={styles.avatarImage}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={24} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.typeIconContainer}>
                    <Ionicons name={typeIconName} size={14} color="#F68537" />
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <Text style={styles.nameText}>{displayName}</Text>
                <View style={styles.statusRow}>
                    <Ionicons name={statusIconName} size={14} color={statusColor} style={styles.statusIcon} />
                    <Text style={styles.statusText}>
                        {item.status === 'missed' ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'}{durationStr} • {simpleFormatDistance(item.created_at)}
                    </Text>
                </View>
            </View>

            {!isSelectionMode && (
                <TouchableOpacity 
                    onPress={() => otherUser && onChatPress(otherUser.id, displayName, displayImg)}
                    style={styles.chatButton}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#F68537" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

export default CallLogItem;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    checkboxContainer: {
        marginRight: 12,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E5E7EB',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeIconContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 2,
    },
    detailsContainer: {
        flex: 1,
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusIcon: {
        marginRight: 4,
    },
    statusText: {
        fontSize: 13,
        color: '#6B7280',
    },
    chatButton: {
        padding: 8,
    }
});
