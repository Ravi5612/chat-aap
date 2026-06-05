import { useState, useEffect, useCallback } from 'react';
import { AppStorage } from '@/lib/storage';

const EMOJI_STORE_KEY = 'recent_emojis_freq';

export const useRecentEmojis = (maxCount = 20) => {
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
    const [frequencies, setFrequencies] = useState<Record<string, number>>({});

    // Load from storage on mount
    useEffect(() => {
        AppStorage.getItemAsync(EMOJI_STORE_KEY).then(data => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    setFrequencies(parsed);
                    // Sort by frequency
                    const sorted = Object.keys(parsed).sort((a, b) => parsed[b] - parsed[a]).slice(0, maxCount);
                    setRecentEmojis(sorted);
                } catch (e) { console.error("Failed to parse emojis"); }
            }
        });
    }, [maxCount]);

    const addRecentEmoji = useCallback((emoji: string) => {
        setFrequencies(prev => {
            const newFreqs = { ...prev, [emoji]: (prev[emoji] || 0) + 1 };
            // Sort and take top N
            const sorted = Object.keys(newFreqs).sort((a, b) => newFreqs[b] - newFreqs[a]).slice(0, maxCount);
            setRecentEmojis(sorted);
            
            // Persist
            AppStorage.setItemAsync(EMOJI_STORE_KEY, JSON.stringify(newFreqs)).catch(() => {});
            return newFreqs;
        });
    }, [maxCount]);

    return { topEmojis: recentEmojis, addEmoji: addRecentEmoji };
}
