import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacySafetyScreen() {
    const router = useRouter();

    const tips = [
        {
            title: "Protect Your Account",
            desc: "Never share your password or verification codes with anyone. ChatWarriors will never ask for your password via chat or email.",
            icon: "shield-lock-outline",
            color: "#F68537"
        },
        {
            title: "Control Visibility",
            desc: "Use the 'Edit Profile' section to hide your email, phone number, or online status from people who aren't in your friend list.",
            icon: "eye-off-outline",
            color: "#10B981"
        },
        {
            title: "Safe Interactions",
            desc: "Only accept friend requests from people you know and trust. Block and report any user who makes you feel uncomfortable.",
            icon: "account-check-outline",
            color: "#3B82F6"
        },
        {
            title: "Beware of Scams",
            desc: "Don't click on suspicious links or download files from unknown senders. Scammers often use 'urgent' messages to trick you.",
            icon: "alert-octagon-outline",
            color: "#EF4444"
        },
        {
            title: "Report Issues",
            desc: "If you notice any suspicious activity on your account, reach out to our support team immediately.",
            icon: "help-buoy-outline",
            color: "#8B5CF6"
        }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFDFB' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy & Safety</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                    <View style={styles.heroSection}>
                        <LinearGradient
                            colors={['#FFF7ED', '#FFFDFB']}
                            style={styles.heroBadge}
                        >
                            <MaterialCommunityIcons name="security" size={48} color="#F68537" />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>Your Safety Matters</Text>
                        <Text style={styles.heroText}>
                            We're committed to keeping your data and conversations secure. Follow these tips to enhance your security.
                        </Text>
                    </View>

                    <Text style={styles.sectionLabel}>SECURITY TIPS</Text>

                    {tips.map((tip, index) => (
                        <View key={index} style={styles.tipCard}>
                            <View style={[styles.iconContainer, { backgroundColor: tip.color + '10' }]}>
                                <MaterialCommunityIcons name={tip.icon as any} size={26} color={tip.color} />
                            </View>
                            <View style={styles.tipContent}>
                                <Text style={styles.tipTitle}>{tip.title}</Text>
                                <Text style={styles.tipDesc}>{tip.desc}</Text>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={styles.blockButton}
                        onPress={() => router.push('/search')} // Assuming they go search to find someone to block? Or maybe to help center.
                    >
                        <Text style={styles.blockButtonText}>Contact Support</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFDFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerIcon: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFEEDD',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    heroText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginBottom: 20,
        letterSpacing: 1.5,
    },
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
    blockButton: {
        marginTop: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    blockButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    }
});
