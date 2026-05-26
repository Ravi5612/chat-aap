import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useChatStore } from '@/store/useChatStore';

export const useMessageList = (messages: any[], currentUser: any) => {
    const flatListRef = useRef<FlatList>(null);

    // Scroll-to-bottom button state
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const isAtBottomRef = useRef(true);
    const prevMsgCountRef = useRef(messages.length);

    // Track new messages while scrolled away
    useEffect(() => {
        const newCount = messages.length;
        const prevCount = prevMsgCountRef.current;
        if (!isAtBottomRef.current && newCount > prevCount) {
            setUnreadCount(prev => prev + (newCount - prevCount));
        }
        prevMsgCountRef.current = newCount;
    }, [messages.length]);

    const showBtn = useCallback(() => setShowScrollBtn(true), []);
    const hideBtn = useCallback(() => setShowScrollBtn(false), []);

    const handleScroll = useCallback((event: any) => {
        const atBottom = event.nativeEvent.contentOffset.y < 60;
        isAtBottomRef.current = atBottom;
        if (atBottom) { setUnreadCount(0); hideBtn(); }
        else { showBtn(); }
    }, [showBtn, hideBtn]);

    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setUnreadCount(0);
        isAtBottomRef.current = true;
        hideBtn();
    }, [hideBtn]);

    // Date-grouped messages for inverted FlatList
    const groupedMessages = useMemo(() => {
        const items: any[] = [];
        const sortedMessages = [...messages].reverse();
        sortedMessages.forEach((msg, index) => {
            if (!msg || !msg.created_at) return;
            items.push({ ...msg, type: 'message' });
            const date = new Date(msg.created_at).toDateString();
            const nextDate = sortedMessages[index + 1]
                ? new Date(sortedMessages[index + 1].created_at).toDateString() : '';
            if (date !== nextDate) {
                items.push({ id: `date-${date}`, type: 'date', date });
            }
        });
        return items;
    }, [messages]);

    // Scroll to a replied-to message (with fallback load from Supabase)
    const handleScrollToMessage = useCallback(async (replyMsg: any) => {
        if (!replyMsg?.id) return;

        const index = groupedMessages.findIndex(m => m.id === replyMsg.id);
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            return;
        }

        // Fallback: load older messages up to that id
        const firstMessage = messages.find(m => m.id && !m.id.startsWith('date-') && m.file_type !== 'system');
        if (!firstMessage || !currentUser) return;

        const isGroup = !!firstMessage.group_id;
        const friendId = isGroup
            ? firstMessage.group_id
            : (firstMessage.sender_id === currentUser?.id ? firstMessage.receiver_id : firstMessage.sender_id);
        if (!friendId) return;

        const success = await useChatStore.getState().loadMessagesUpToId(friendId, currentUser, isGroup, replyMsg.id, replyMsg.created_at);
        if (success) {
            setTimeout(() => {
                const latest = useChatStore.getState().messages;
                const sorted = [...latest].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const rebuilt: any[] = [];
                sorted.forEach((msg, idx) => {
                    rebuilt.push(msg);
                    const date = new Date(msg.created_at).toDateString();
                    const nextDate = sorted[idx + 1] ? new Date(sorted[idx + 1].created_at).toDateString() : '';
                    if (date !== nextDate) rebuilt.push({ id: `date-${date}`, type: 'date', date });
                });
                const newIndex = rebuilt.findIndex(m => m.id === replyMsg.id);
                if (newIndex !== -1) {
                    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0.5 });
                }
            }, 300);
        }
    }, [groupedMessages, messages, currentUser]);

    return {
        flatListRef,
        showScrollBtn,
        unreadCount,
        groupedMessages,
        handleScroll,
        scrollToBottom,
        handleScrollToMessage,
    };
};
