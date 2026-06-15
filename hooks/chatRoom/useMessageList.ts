import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useChatStore } from '@/store/useChatStore';

export const useMessageList = (messages: any[], currentUser: any) => {
    const flatListRef = useRef<FlatList>(null);

    // Scroll-to-bottom button state
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [scrollPercentage, setScrollPercentage] = useState(0);
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
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent || {};
        const y = contentOffset?.y || 0;
        const atBottom = y < 60;
        isAtBottomRef.current = atBottom;
        if (atBottom) { setUnreadCount(0); hideBtn(); }
        else { showBtn(); }

        const maxScroll = Math.max(0, (contentSize?.height || 0) - (layoutMeasurement?.height || 0));
        if (maxScroll > 0) {
            let percentage = y / maxScroll;
            if (isNaN(percentage) || !isFinite(percentage)) percentage = 0;
            percentage = Math.max(0, Math.min(1, percentage));
            setScrollPercentage(percentage);
        } else {
            setScrollPercentage(0);
        }
    }, [showBtn, hideBtn]);

    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setUnreadCount(0);
        isAtBottomRef.current = true;
        hideBtn();
    }, [hideBtn]);

    // Date-grouped messages for inverted FlatList
    // inverted=true → index 0 = screen BOTTOM → array must be DESCENDING (newest first)
    const groupedMessages = useMemo(() => {
        // Always sort newest → oldest regardless of how messages arrived in store
        const sorted = [...messages].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const items: any[] = [];
        for (let i = 0; i < sorted.length; i++) {
            const msg = sorted[i];
            if (!msg || !msg.created_at) continue;

            items.push({ ...msg, type: 'message' });

            const currentDateStr = new Date(msg.created_at).toDateString();
            const nextMsg = sorted[i + 1];

            if (!nextMsg) {
                // Last (oldest) message — add its date label at very top of screen
                items.push({ id: `date-${currentDateStr}`, type: 'date', date: currentDateStr });
            } else {
                const nextDateStr = new Date(nextMsg.created_at).toDateString();
                if (currentDateStr !== nextDateStr) {
                    // Day changed (going older) — insert separator for the CURRENT day before moving to older
                    items.push({ id: `date-${currentDateStr}`, type: 'date', date: currentDateStr });
                }
            }
        }
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
                let nextDateFallback = sorted.length > 0 && sorted[0]?.created_at ? new Date(sorted[0].created_at).toDateString() : '';
                
                for (let idx = 0; idx < sorted.length; idx++) {
                    const msg = sorted[idx];
                    rebuilt.push(msg);
                    
                    const currentDateStr = nextDateFallback;
                    const nextMsg = sorted[idx + 1];
                    nextDateFallback = nextMsg && nextMsg.created_at ? new Date(nextMsg.created_at).toDateString() : '';
                    
                    if (currentDateStr !== nextDateFallback) {
                        rebuilt.push({ id: `date-${currentDateStr}`, type: 'date', date: currentDateStr });
                    }
                }
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
        scrollPercentage,
        groupedMessages,
        handleScroll,
        scrollToBottom,
        handleScrollToMessage,
    };
};
