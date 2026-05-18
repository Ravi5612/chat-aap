import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    StyleSheet,
    Dimensions,
    Platform,
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EMOJI_CATEGORIES = [
    { title: 'Smileys', data: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'] },
    { title: 'Gestures', data: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'] },
    { title: 'Hearts', data: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
    { title: 'Animals', data: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
    { title: 'Food', data: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧉', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🧊', '🥤'] },
];

interface EmojiPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    isInline?: boolean;
}

export default function EmojiPickerModal({ visible, onClose, onSelect, isInline = false }: EmojiPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const allEmojis = useMemo(() => {
        const flattened = EMOJI_CATEGORIES.reduce((acc, cat) => [...acc, ...cat.data], [] as string[]);
        if (!searchQuery.trim()) return flattened;
        return flattened;
    }, [searchQuery]);

    const renderContent = () => (
        <View style={isInline ? styles.inlineContent : styles.content}>
            {!isInline && <View style={styles.handle} />}

            <View style={styles.header}>
                <Text style={styles.title}>Select Emoji</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search emojis..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={allEmojis}
                keyExtractor={(item, index) => `${item}-${index}`}
                numColumns={8}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.emojiItem}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(item);
                        }}
                    >
                        <Text style={styles.emojiText}>{item}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {!isInline && <SafeAreaView edges={['bottom']} />}
        </View>
    );

    if (isInline) {
        return renderContent();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>
                {renderContent()}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    content: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.7,
        minHeight: SCREEN_HEIGHT * 0.5,
        paddingTop: 12,
    },
    inlineContent: {
        backgroundColor: 'white',
        height: 280,
        paddingTop: 4,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        position: 'relative',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        top: 0,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1E293B',
    },
    listContent: {
        paddingHorizontal: 8,
        paddingBottom: 20,
    },
    emojiItem: {
        width: `${100 / 8}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 28,
        textAlign: 'center',
    },
});
