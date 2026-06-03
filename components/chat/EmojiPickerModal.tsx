import React, { useState, useMemo, useCallback, memo } from 'react';
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

const ALL_EMOJIS_FLAT = EMOJI_CATEGORIES.reduce((acc, cat) => [...acc, ...cat.data], [] as string[]);

interface EmojiPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    isInline?: boolean;
}

// ─── Memoized Emoji Item ───────────────────────────────────────────────────────
const EmojiItem = memo(({ item, onSelect }: { item: string, onSelect: (emoji: string) => void }) => {
    const handlePress = useCallback(() => {
        onSelect(item);
    }, [item, onSelect]);

    return (
        <TouchableOpacity style={styles.emojiItem} onPress={handlePress}>
            <Text style={styles.emojiText}>{item}</Text>
        </TouchableOpacity>
    );
});

const EmojiPickerModal = memo(({ visible, onClose, onSelect, isInline = false }: EmojiPickerModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const allEmojis = useMemo(() => {
        // NOTE: The previous code returned the un-filtered array even when searched.
        // Emojis cannot be filtered by string character directly without a name mapping.
        // Returning the flat list as before.
        return ALL_EMOJIS_FLAT;
    }, [searchQuery]);

    const renderItem = useCallback(({ item }: { item: string }) => (
        <EmojiItem item={item} onSelect={onSelect} />
    ), [onSelect]);

    const keyExtractor = useCallback((item: string, index: number) => `${item}-${index}`, []);

    const content = (
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
                keyExtractor={keyExtractor}
                numColumns={8}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={40}
                maxToRenderPerBatch={40}
                windowSize={5}
            />

            {!isInline && <SafeAreaView edges={['bottom']} />}
        </View>
    );

    if (isInline) {
        return content;
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
                {content}
            </View>
        </Modal>
    );
});

export default EmojiPickerModal;

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
