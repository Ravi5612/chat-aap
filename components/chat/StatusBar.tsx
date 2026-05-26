import React from 'react';
import { View, ScrollView } from 'react-native';
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

export default function StatusBar({
    myStatuses,
    statusInfo = {},
    friendsWithStatus,
    onAddClick,
    onViewStatus,
    onViewMyStatus
}: StatusBarProps) {
    const hasHistory = Object.keys(myStatuses).some(key => key !== 'active');
    const hasFriends = friendsWithStatus.length > 0;

    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{
                backgroundColor: '#FDF7E7', // Light sandy background for the card
                borderRadius: 32,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
            }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'flex-start' }}
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
                        <View style={{ width: 1, height: 60, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 24, marginTop: 28 }} />
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
}
