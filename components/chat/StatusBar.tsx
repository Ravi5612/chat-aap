import React, { memo, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import MyStatusSection from './status/MyStatusSection';
import HistorySection from './status/HistorySection';
import FriendsStatusSection from './status/FriendsStatusSection';

interface StatusBarProps {
    myStatuses: any;
    statusInfo: any;
    friendsWithStatus: any[];
    onAddClick: () => void;
    onViewStatus: (item: any) => void;
    onViewMyStatus: () => void;
}

const EMPTY_OBJ = {};

const StatusBar = memo(function StatusBar({
    myStatuses,
    statusInfo = EMPTY_OBJ,
    friendsWithStatus,
    onAddClick,
    onViewStatus,
    onViewMyStatus
}: StatusBarProps) {
    const hasHistory = useMemo(() => {
        if (!myStatuses) return false;
        return Object.keys(myStatuses).some(key => key !== 'active');
    }, [myStatuses]);
    
    const hasFriends = friendsWithStatus && friendsWithStatus.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* 1. My Status Section */}
                    <MyStatusSection
                        myStatuses={myStatuses}
                        statusInfo={statusInfo}
                        onAddClick={onAddClick}
                        onViewMyStatus={onViewMyStatus}
                    />

                    {/* 2. Vertical Divider */}
                    {(hasHistory || hasFriends) && (
                        <View style={styles.divider} />
                    )}

                    {/* 3. Recent History Section */}
                    <HistorySection
                        myStatuses={myStatuses}
                        onViewStatus={onViewStatus}
                    />

                    {/* 4. Friends Statuses Section */}
                    <FriendsStatusSection
                        friendsWithStatus={friendsWithStatus}
                        statusInfo={statusInfo}
                        onViewStatus={onViewStatus}
                    />
                </ScrollView>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    card: {
        backgroundColor: '#FDF7E7', // Light sandy background for the card
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    scrollContent: {
        alignItems: 'flex-start'
    },
    divider: {
        width: 1,
        height: 60,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginRight: 24,
        marginTop: 28
    }
});

export default StatusBar;
