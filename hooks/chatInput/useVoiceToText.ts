import { useState, useEffect, useCallback } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export function useVoiceToText(onTextChange: (text: string) => void) {
    const [isListening, setIsListening] = useState(false);
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechPartialResults = onSpeechPartialResults;
        Voice.onSpeechError = onSpeechError;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const onSpeechStart = (e: any) => {
        setIsListening(true);
        setError(null);
        setPartialText('');
    };

    const onSpeechEnd = (e: any) => {
        setIsListening(false);
    };

    const onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
            onTextChange(e.value[0]);
            setPartialText('');
            setIsListening(false);
        }
    };

    const onSpeechPartialResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
            setPartialText(e.value[0]);
        }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
        console.error('Voice Recognition Error:', e.error);
        setIsListening(false);
        if (e.error?.message?.includes('No match')) {
            // Ignore no match errors
        } else {
            setError(e.error?.message || 'Unknown error');
        }
    };

    const startListening = useCallback(async () => {
        try {
            setError(null);
            setPartialText('');
            await Voice.start('en-US'); // You can change this to 'hi-IN' for Hindi or dynamically set it
        } catch (e: any) {
            console.error('Failed to start listening:', e);
            setError(e.message);
        }
    }, []);

    const stopListening = useCallback(async () => {
        try {
            await Voice.stop();
        } catch (e) {
            console.error('Failed to stop listening:', e);
        }
    }, []);
    
    const cancelListening = useCallback(async () => {
        try {
            await Voice.cancel();
            setIsListening(false);
            setPartialText('');
        } catch(e) {
             console.error('Failed to cancel listening:', e);
        }
    }, [])

    return {
        isListening,
        partialText,
        error,
        startListening,
        stopListening,
        cancelListening
    };
}
