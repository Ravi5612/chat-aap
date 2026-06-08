import { useState, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export const useVoiceTyping = (setMessage: React.Dispatch<React.SetStateAction<string>>) => {
    const [isVoiceTyping, setIsVoiceTyping] = useState(false);
    const [voiceLang, setVoiceLang] = useState('hi-IN');

    useSpeechRecognitionEvent('start', () => setIsVoiceTyping(true));
    useSpeechRecognitionEvent('end',   () => setIsVoiceTyping(false));
    useSpeechRecognitionEvent('error', (event) => {
        console.log('Voice Error:', event.error, event.message);
        setIsVoiceTyping(false);
    });
    useSpeechRecognitionEvent('result', (event) => {
        if (event.results?.length > 0) {
            const transcript = event.results[0]?.transcript;
            if (transcript) setMessage(prev => prev + (prev.length > 0 ? ' ' : '') + transcript);
        }
    });

    const startVoiceTyping = useCallback(async () => {
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) { console.warn('Voice permission not granted'); return; }
            ExpoSpeechRecognitionModule.start({ lang: voiceLang, interimResults: true, continuous: false });
        } catch (e) { console.error(e); }
    }, [voiceLang]);

    const stopVoiceTyping = useCallback(() => {
        try { ExpoSpeechRecognitionModule.stop(); } catch (e) { console.error(e); }
    }, []);

    const toggleLang = useCallback(() => setVoiceLang(p => p === 'hi-IN' ? 'en-US' : 'hi-IN'), []);

    return { isVoiceTyping, voiceLang, startVoiceTyping, stopVoiceTyping, toggleLang };
};
