import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { encoder } from './globals';

/**
 * 🔐 Encrypt plain text message
 */
export async function encryptText(plainText: string, cryptoKey: Uint8Array): Promise<string | null> {
    if (!plainText || !cryptoKey) return null;

    try {
        // Random IV using expo-crypto
        const iv = Crypto.getRandomBytes(12);

        // ✅ Noble AES-GCM encrypt - same as web app
        const aes = gcm(new Uint8Array(cryptoKey), new Uint8Array(iv));
        const encrypted = aes.encrypt(encoder.encode(plainText));

        return JSON.stringify({
            iv: Array.from(iv),
            content: Array.from(encrypted),
        });
    } catch (error: any) {
        console.error("Encryption error:", error);
        return null;
    }
}

/**
 * 🔓 Decrypt encrypted message object
 */
export async function decryptText(encryptedData: any, cryptoKey: Uint8Array): Promise<string> {
    if (!encryptedData || !cryptoKey) return "";

    try {
        let dataToDecrypt = encryptedData;

        // Parse if it's a JSON string
        if (typeof encryptedData === 'string') {
            if (!encryptedData.startsWith('{')) return encryptedData;
            try {
                dataToDecrypt = JSON.parse(encryptedData);
            } catch {
                return encryptedData;
            }
        }

        // Validate structure
        if (!dataToDecrypt || !dataToDecrypt.iv || !dataToDecrypt.content) {
            return typeof encryptedData === 'string' ? encryptedData : "";
        }

        const iv = new Uint8Array(Array.from(Object.values(dataToDecrypt.iv) as number[]));
        const content = new Uint8Array(Array.from(Object.values(dataToDecrypt.content) as number[]));

        if (iv.length !== 12) {
            console.warn("Crypto: Invalid IV length:", iv.length);
            return typeof encryptedData === 'string' ? encryptedData : "";
        }

        // ✅ Noble AES-GCM decrypt - same as web app
        const aes = gcm(new Uint8Array(cryptoKey), iv);
        const decrypted = aes.decrypt(content);

        return new TextDecoder().decode(decrypted);

    } catch (error: any) {
        console.warn("Decryption failed:", error?.message || String(error));
        // Fail gracefully - return placeholder, don't crash
        const errorMsg = '⚠️ Message cannot be decrypted (Keys changed)';
        if (typeof encryptedData === 'string' && encryptedData.startsWith('{')) return errorMsg;
        return typeof encryptedData === 'string' ? encryptedData : errorMsg;
    }
}
