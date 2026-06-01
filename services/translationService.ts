// Free Translation using MyMemory API (1 lakh words/day free - no API key needed)
// Auto-detects language and translates to the opposite language (Hindi ↔ English)

export async function translateMessage(text: string): Promise<{ translatedText: string; detectedLang: string } | null> {
    try {
        // Step 1: Detect the language using MyMemory API
        const detectRes = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 100))}&langpair=en|hi`
        );
        const detectData = await detectRes.json();

        // Step 2: Check detected language from response
        const detectedLang = detectData?.matches?.[0]?.["last-used-translation"]?.source ?? 'en';

        // Step 3: Translate - if Hindi → English, if English (or other) → Hindi
        const isHindi = detectedLang === 'hi' || /[\u0900-\u097F]/.test(text);
        const langPair = isHindi ? 'hi|en' : 'en|hi';
        const targetLabel = isHindi ? 'English' : 'हिंदी';

        const translateRes = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
        );
        const translateData = await translateRes.json();
        const translatedText = translateData?.responseData?.translatedText;

        if (!translatedText || translateData?.responseStatus !== 200) {
            return null;
        }

        return { translatedText, detectedLang: targetLabel };
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}
