import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const EMOJI_STORE_KEY = 'chatwarriors_emoji_frequencies';
const DEFAULT_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🙏'];

export function useRecentEmojis() {
    const [frequencies, setFrequencies] = useState<Record<string, number>>({});
    const [topEmojis, setTopEmojis] = useState<string[]>(DEFAULT_EMOJIS);

    useEffect(() => {
        SecureStore.getItemAsync(EMOJI_STORE_KEY).then(data => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    setFrequencies(parsed);
                    updateTopEmojis(parsed);
                } catch (e) {}
            }
        }).catch(() => {});
    }, []);

    const updateTopEmojis = (freqs: Record<string, number>) => {
        const sorted = Object.keys(freqs).sort((a, b) => freqs[b] - freqs[a]);
        // Merge with defaults and keep unique, then take top 7
        const combined = Array.from(new Set([...sorted, ...DEFAULT_EMOJIS]));
        setTopEmojis(combined.slice(0, 7));
    };

    const addEmoji = async (emoji: string) => {
        setFrequencies(prev => {
            const newFreqs = { ...prev, [emoji]: (prev[emoji] || 0) + 1 };
            updateTopEmojis(newFreqs);
            SecureStore.setItemAsync(EMOJI_STORE_KEY, JSON.stringify(newFreqs)).catch(() => {});
            return newFreqs;
        });
    };

    return { topEmojis, addEmoji };
}
