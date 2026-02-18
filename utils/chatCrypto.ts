/**
 * 🔐 Chat Encryption - Noble Library (AES-256-GCM + PBKDF2)
 * ✅ Web App (chat-app) ke saath 100% compatible
 * ✅ Same library, same output, cross-platform sync guaranteed
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Ensure Web Standard APIs are available in RN
if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}

if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
        encode(str: string) {
            const buf = Buffer.from(str, 'utf-8');
            return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
    } as any;
}

if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
        decode(arr: Uint8Array) {
            return Buffer.from(arr).toString('utf-8');
        }
    } as any;
}

const SALT = "supabase-secure-chat-v1";
const encoder = new TextEncoder();

/**
 * 🔑 Generate deterministic crypto key for a chat
 * Same key will be generated for both users on both platforms
 */
export async function getChatKey(userId: string, friendId: string, isGroup: boolean = false): Promise<Uint8Array> {
    if (!userId || !friendId) {
        throw new Error("Invalid IDs for chat key");
    }

    // Same baseKey logic as web app
    const baseKey = isGroup ? `group_v6:${friendId}` : [userId, friendId].sort().join(":");

    // ✅ Noble PBKDF2 - same as web app
    const key = pbkdf2(sha256, encoder.encode(baseKey), encoder.encode(SALT), {
        c: 1000,
        dkLen: 32 // 256 bits
    });

    console.log(`Crypto: Key generated for ${baseKey.substring(0, 8)}`);
    return new Uint8Array(key);
}

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
        console.warn("Decryption failed:", error.message);
        // Fail gracefully - return empty string, don't crash
        if (typeof encryptedData === 'string' && encryptedData.startsWith('{')) return '';
        return typeof encryptedData === 'string' ? encryptedData : '';
    }
}
