import { useState } from 'react';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { translateMessage } from '@/services/translationService';

export const useMessageTools = () => {
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; lang: string }>>({});
    const [autoListenMode, setAutoListenMode] = useState(false);

    const toggleAutoListen = () => setAutoListenMode(prev => !prev);

    const handleTranslate = (selectedMessage: any) => {
        if (!selectedMessage) return;
        const msgId = selectedMessage.id;
        if (translatedMessages[msgId]) {
            setTranslatedMessages(prev => { const n = { ...prev }; delete n[msgId]; return n; });
            return;
        }
        const rawText = selectedMessage.message || '';
        const cleanText = rawText
            .replace(/\[Image\]\s*\S+/g, '')
            .replace(/\[Video\]\s*\S+/g, '')
            .replace(/\[Voice Message\]\s*\S+/g, '')
            .replace(/\[Document\][^|]+\|?[^|]*/g, '')
            .replace(/\[Contact\][^|]+\|?[^|]*/g, '')
            .replace(/\[Location\][^|]+\|?[^|]*/g, '')
            .trim();

        if (!cleanText) {
            Alert.alert('Nothing to translate', 'This message has no text to translate.');
            return;
        }

        translateMessage(cleanText).then(result => {
            if (result) {
                setTranslatedMessages(prev => ({
                    ...prev,
                    [msgId]: { text: result.translatedText, lang: result.detectedLang }
                }));
            } else {
                Alert.alert('Translation Failed', 'Could not translate this message. Please try again.');
            }
        });
    };

    const handleListen = (selectedMessage: any) => {
        if (!selectedMessage) return;
        const textToSpeak = selectedMessage.message || '';
        const cleanText = textToSpeak
            .replace(/\[Image\]\s*\S+/g, 'Image')
            .replace(/\[Video\]\s*\S+/g, 'Video')
            .replace(/\[Voice Message\]\s*\S+/g, 'Voice Message')
            .replace(/\[Document\][^|]+\|?[^|]*/g, 'Document')
            .replace(/\[Contact\][^|]+\|?[^|]*/g, 'Contact')
            .replace(/\[Location\][^|]+\|?[^|]*/g, 'Location')
            .trim();

        if (!cleanText) {
            Alert.alert('Nothing to read', 'This message has no text to speak.');
            return;
        }

        const isHindi = /[\u0900-\u097F]/.test(cleanText);
        const lang = isHindi ? 'hi-IN' : 'en-US';

        Speech.isSpeakingAsync().then(isSpeaking => {
            if (isSpeaking) {
                Speech.stop();
            } else {
                Speech.speak(cleanText, {
                    language: lang,
                    pitch: 1.0,
                    rate: 0.9,
                });
            }
        });
    };

    return {
        translatedMessages,
        autoListenMode,
        toggleAutoListen,
        handleTranslate,
        handleListen
    };
};
