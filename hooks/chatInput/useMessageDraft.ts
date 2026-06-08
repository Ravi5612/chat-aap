import { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput } from 'react-native';

interface UseMessageDraftProps {
    initialMessage?: string;
    editingMessage?: any;
    replyingTo?: any;
    onDraftChange?: (text: string) => void;
    onTyping?: (isTyping: boolean) => void;
    onSendMessage: (text: string, scheduledDate?: Date) => void;
    onSaveEdit?: (text: string) => void;
    setIsRecording: (r: boolean) => void;
    selectedMedia: { uri: string, type: 'image' | 'video' } | null;
    setSelectedMedia: (media: any) => void;
}

export const useMessageDraft = ({
    initialMessage = '',
    editingMessage,
    replyingTo,
    onDraftChange,
    onTyping,
    onSendMessage,
    onSaveEdit,
    setIsRecording,
    selectedMedia,
    setSelectedMedia,
}: UseMessageDraftProps) => {
    const [message, setMessage] = useState(initialMessage);
    const inputRef = useRef<TextInput>(null);
    
    const typingTimeoutRef = useRef<any>(null);
    const draftTimeoutRef = useRef<any>(null);
    const lastSentTimeRef = useRef(0);
    const lastTypingSentRef = useRef(0);

    useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.message);
            inputRef.current?.focus();
        } else if (replyingTo) {
            inputRef.current?.focus();
        }
    }, [editingMessage, replyingTo]);

    useEffect(() => {
        if (initialMessage) setMessage(initialMessage);
    }, [initialMessage]);

    const handleChangeText = useCallback((text: string) => {
        setMessage(text);
        if (onDraftChange) {
            if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
            draftTimeoutRef.current = setTimeout(() => { onDraftChange(text); }, 500);
        }
        if (onTyping) {
            const now = Date.now();
            if (now - lastTypingSentRef.current > 3000) {
                onTyping(true);
                lastTypingSentRef.current = now;
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
                lastTypingSentRef.current = 0;
            }, 2000);
        }
    }, [onDraftChange, onTyping]);

    const handleSubmit = useCallback((scheduledDate?: Date) => {
        if (!message.trim() && !selectedMedia) {
            if (Date.now() - lastSentTimeRef.current < 500) return;
            setIsRecording(true);
            return;
        }
        if (editingMessage && onSaveEdit) {
            onSaveEdit(message.trim());
        } else {
            let finalMessage = message.trim();
            if (selectedMedia) {
                const prefix = selectedMedia.type === 'video' ? '[Video]' : '[Image]';
                finalMessage = `${prefix} ${selectedMedia.uri} ${message.trim()}`;
            }
            onSendMessage(finalMessage, scheduledDate);
        }
        lastSentTimeRef.current = Date.now();
        setMessage('');
        setSelectedMedia(null);
        if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
        if (onDraftChange) onDraftChange('');
        if (onTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            onTyping(false);
        }
    }, [message, selectedMedia, editingMessage, onSaveEdit, onSendMessage, onDraftChange, onTyping, setIsRecording, setSelectedMedia]);

    return { message, setMessage, handleChangeText, handleSubmit, inputRef };
};
