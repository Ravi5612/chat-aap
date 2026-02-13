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
            return Buffer.from(str, 'utf-8');
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
        c: 150000,
        dkLen: 32 // 256 bits
    });

    return key;
}

/**
 * 🔐 Encrypt plain text message
 */
export async function encryptText(plainText: string, cryptoKey: Uint8Array): Promise<string | null> {
    if (!plainText || !cryptoKey) return null;

    try {
        const iv = Crypto.getRandomValues(new Uint8Array(12));
        const aes = gcm(cryptoKey, iv);

        const plainTextBytes = new TextEncoder().encode(plainText);
        const encrypted = aes.encrypt(plainTextBytes);

        return JSON.stringify({
            iv: Array.from(iv),
            content: Array.from(encrypted),
        });
    } catch (error) {
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

        if (typeof encryptedData === 'string') {
            try {
                dataToDecrypt = JSON.parse(encryptedData);
            } catch {
                return encryptedData;
            }
        }

        if (!dataToDecrypt || !dataToDecrypt.iv || !dataToDecrypt.content) {
            return typeof encryptedData === 'string' ? encryptedData : "";
        }

        const iv = new Uint8Array(dataToDecrypt.iv);
        const content = new Uint8Array(dataToDecrypt.content);

        const aes = gcm(cryptoKey, iv);
        const decrypted = aes.decrypt(content);

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error("Decryption error:", error);
        return "🚫 [Decryption Failed]";
    }
}
