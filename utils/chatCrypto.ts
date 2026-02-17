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
const encoder = new TextEncoder();

/**
 * 🔑 Generate deterministic crypto key for a chat
 */
export async function getChatKey(userId: string, friendId: string, isGroup: boolean = false): Promise<Uint8Array> {
    if (!userId || !friendId) {
        throw new Error("Invalid IDs for chat key");
    }

    const baseKey = isGroup ? `group_v6:${friendId}` : [userId, friendId].sort().join(":");

    // Noble hashes pbkdf2 - ensure we use bytes for password and salt for parity with Web Crypto
    const key = pbkdf2(sha256, encoder.encode(baseKey), encoder.encode(SALT), {
        c: 1000,
        dkLen: 32 // 256 bits
    });

    console.log(`Crypto: Key generated. BaseKey: ${baseKey.substring(0, 10)}... Size: ${key.length}`);

    return new Uint8Array(key);
}

/**
 * 🔐 Encrypt plain text message
 */
export async function encryptText(plainText: string, cryptoKey: Uint8Array): Promise<string | null> {
    if (!plainText || !cryptoKey) return null;

    try {
        const iv = Crypto.getRandomBytes(12);
        const aes = gcm(new Uint8Array(cryptoKey), new Uint8Array(iv));

        const plainTextBytes = encoder.encode(plainText);
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

        // Convert to Uint8Array safely - handles both array and object representations
        const iv = new Uint8Array(Array.from(Object.values(dataToDecrypt.iv) as number[]));
        const content = new Uint8Array(Array.from(Object.values(dataToDecrypt.content) as number[]));

        if (iv.length !== 12) {
            console.warn("Crypto: Invalid IV length:", iv.length);
            return typeof encryptedData === 'string' ? encryptedData : "";
        }

        // Attempt initialization
        const aes = gcm(new Uint8Array(cryptoKey), iv);
        const decrypted = aes.decrypt(content);

        return new TextDecoder().decode(decrypted);
    } catch (error: any) {
        // Log the error but don't crash
        console.warn("Decryption failed:", error.message);

        if (error.message?.toLowerCase().includes('tag') || error.message?.toLowerCase().includes('mac')) {
            return "🚫 [Secure Message - Key Mismatch]";
        }

        return "🚫 [Decrypt Error: " + (error.message || "Unknown") + "]";
    }
}
