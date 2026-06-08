import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface PrivacyCardProps {
    iconName: any;
    iconLib: 'ionicons' | 'material';
    iconColor: string;
    bgColor: string;
    title: string;
    desc: string;
    type: 'switch' | 'link';
    
    // For Switch
    value?: boolean;
    onValueChange?: (val: boolean) => void;
    trackColors?: { false: string, true: string };
    thumbColors?: { false: string, true: string };
    
    // For Link
    onPress?: () => void;
    badgeCount?: number;
    
    // Extras
    extraContent?: React.ReactNode;
}

export const PrivacyCard: React.FC<PrivacyCardProps> = ({
    iconName, iconLib, iconColor, bgColor, title, desc, type,
    value, onValueChange, trackColors, thumbColors,
    onPress, badgeCount, extraContent
}) => {
    const IconComponent = iconLib === 'ionicons' ? Ionicons : MaterialCommunityIcons;

    const content = (
        <>
            <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                <IconComponent name={iconName} size={26} color={iconColor} />
            </View>
            <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{title}</Text>
                <Text style={styles.tipDesc}>{desc}</Text>
                {extraContent}
            </View>
            {type === 'switch' && (
                <Switch 
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={trackColors || { false: '#E5E7EB', true: '#FFEDD5' }}
                    thumbColor={value ? (thumbColors?.true || iconColor) : (thumbColors?.false || '#FFFFFF')}
                    style={{ alignSelf: 'center' }}
                />
            )}
            {type === 'link' && (
                <>
                    {badgeCount !== undefined && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{badgeCount}</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ alignSelf: 'center', marginLeft: badgeCount !== undefined ? 8 : 0 }} />
                </>
            )}
        </>
    );

    if (type === 'link') {
        return (
            <TouchableOpacity onPress={onPress} style={styles.tipCard}>
                {content}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.tipCard}>
            {content}
        </View>
    );
};

const styles = StyleSheet.create({
    tipCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    tipDesc: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    badgeContainer: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        alignSelf: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    }
});
