import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

// Ensure Web Standard APIs are available
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

/**
 * 🔑 Generate deterministic crypto key for a chat
 */
export async function getChatKey(userId: string, friendId: string, isGroup: boolean = false): Promise<Uint8Array> {
    if (!userId || !friendId) {
        throw new Error("Invalid IDs for chat key");
    }

    const baseKey = isGroup ? `group_v6:${friendId}` : [userId, friendId].sort().join(":");

    // Noble hashes pbkdf2 is synchronous but fast
    const key = pbkdf2(sha256, baseKey, SALT, {
        c: 1000,
        dkLen: 32 // 256 bits
    });

    console.log(`Crypto: Key generated for ${userId}-${friendId}. Length: ${key.length}`);

    return new Uint8Array(key);
}

/**
 * 🔐 Encrypt plain text message
 */
export async function encryptText(plainText: string, cryptoKey: Uint8Array): Promise<string | null> {
    if (!plainText || !cryptoKey) return null;

    try {
        const iv = Crypto.getRandomValues(new Uint8Array(12));
        const aes = gcm(new Uint8Array(cryptoKey), new Uint8Array(iv));

        const plainTextBytes = new TextEncoder().encode(plainText);
        const encrypted = aes.encrypt(new Uint8Array(plainTextBytes));

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

        // Convert to Uint8Array safely
        const iv = new Uint8Array(Object.values(dataToDecrypt.iv));
        const content = new Uint8Array(Object.values(dataToDecrypt.content));

        // Attempt initialization
        let aes;
        try {
            aes = gcm(new Uint8Array(cryptoKey), iv);
        } catch (e: any) {
            console.error("Crypto Init Failed (aes/gcm):", e.message);
            return "🚫 [Key Error: " + e.message + "]";
        }

        const decrypted = aes.decrypt(content);
        return new TextDecoder().decode(decrypted);
    } catch (error: any) {
        console.error("Decryption error:", error.message);

        if (error.message?.toLowerCase().includes('mac')) {
            return "🚫 [Secure Message - Key Mismatch]";
        }

        return "🚫 [Decrypt Error: " + (error.message || "Unknown") + "]";
    }
}
