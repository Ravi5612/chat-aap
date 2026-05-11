import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, TextInput, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

interface ContactPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectContact: (name: string, phoneNumber: string) => void;
}

export default function ContactPickerModal({ visible, onClose, onSelectContact }: ContactPickerModalProps) {
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        if (visible) {
            loadContacts();
        } else {
            setSearchQuery('');
            setFilteredContacts([]);
        }
    }, [visible]);

    const loadContacts = async () => {
        setLoading(true);
        setPermissionDenied(false);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
                    sort: Contacts.SortTypes.FirstName,
                });
                
                // Filter out contacts without names or phone numbers
                const validContacts = data.filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0);
                setContacts(validContacts);
                setFilteredContacts(validContacts);
            } else {
                setPermissionDenied(true);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredContacts(contacts);
        } else {
            const lowercased = text.toLowerCase();
            const filtered = contacts.filter(c => 
                c.name?.toLowerCase().includes(lowercased) || 
                c.phoneNumbers?.some(p => p.number?.includes(text))
            );
            setFilteredContacts(filtered);
        }
    };

    const handleSelect = (contact: Contacts.Contact) => {
        const name = contact.name || 'Unknown';
        const phone = contact.phoneNumbers?.[0]?.number || '';
        if (phone) {
            onSelectContact(name, phone);
            onClose();
        }
    };

    const renderItem = ({ item }: { item: Contacts.Contact }) => {
        const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
        const phone = item.phoneNumbers?.[0]?.number || 'No number';
        
        return (
            <TouchableOpacity 
                style={styles.contactItem}
                onPress={() => handleSelect(item)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Contact</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#F68537" />
                        <Text style={styles.loadingText}>Loading contacts...</Text>
                    </View>
                ) : permissionDenied ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="warning-outline" size={48} color="#EF4444" />
                        <Text style={styles.errorText}>Contact permission denied</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadContacts}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredContacts}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            <View style={styles.centerContainer}>
                                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No contacts found</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    listContainer: {
        paddingBottom: 24,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F68537',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
        color: '#6B7280',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 16,
    },
    errorText: {
        marginTop: 12,
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        backgroundColor: '#F68537',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyText: {
        marginTop: 12,
        color: '#9CA3AF',
        fontSize: 16,
    }
});
