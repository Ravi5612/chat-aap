/**
 * 🔐 Chat Encryption - Noble Library (AES-256-GCM + PBKDF2)
 * ✅ Web App (chat-app) ke saath 100% compatible
 * ✅ Same library, same output, cross-platform sync guaranteed
 */

import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { x25519 } from '@noble/curves/ed25519';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';

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

const keyCache = new Map<string, Uint8Array>();
const PRIVATE_KEY_STORAGE = 'e2ee_private_key_v1';

export async function deriveKEKFromPassword(password: string, saltStr: string): Promise<Uint8Array> {
    const pwdBytes = encoder.encode(password);
    const saltBytes = encoder.encode(saltStr);
    
    // Memory-hard Scrypt (N=16384, r=8, p=1). High enough for good security, fast enough for RN JS.
    const key = await scryptAsync(pwdBytes, saltBytes, {
        N: 16384,
        r: 8,
        p: 1,
        dkLen: 32, // 256-bit key for AES-256
    });
    
    return new Uint8Array(key);
}

/**
 * 🔑 Initialize X25519 Keypair for True E2EE
 * Checks local storage first.
 * If password is provided, checks DB for encrypted backup.
 * If no backup exists, generates new key, encrypts it with password KEK, and saves to DB.
 */
export async function initializeX25519Keys(userId: string, password?: string): Promise<string> {
    const keyStoragePath = `e2ee_private_key_v1_${userId}`;
    
    // 1. Check local SecureStore first (Auto-Login scenario)
    const existingKey = await SecureStore.getItemAsync(keyStoragePath);
    if (existingKey) {
        const privateKey = Buffer.from(existingKey, 'base64');
        const publicKey = x25519.getPublicKey(privateKey);
        return Buffer.from(publicKey).toString('base64');
    }

    // 2. If password is provided (Login/Signup scenario), check DB for backup
    if (password) {
        const { data: profile } = await supabase.from('profiles').select('encrypted_private_key, kdf_salt').eq('id', userId).single();
        
        if (profile?.encrypted_private_key && profile?.kdf_salt) {
            // Restore from backup
            try {
                const kek = await deriveKEKFromPassword(password, profile.kdf_salt);
                const decryptedBase64 = await decryptText(profile.encrypted_private_key, kek);
                
                if (decryptedBase64) {
                    const privateKey = Buffer.from(decryptedBase64, 'base64');
                    const publicKey = x25519.getPublicKey(privateKey);
                    
                    await SecureStore.setItemAsync(keyStoragePath, decryptedBase64);
                    console.log("Crypto: Successfully restored E2EE keys from Cloud Backup!");
                    return Buffer.from(publicKey).toString('base64');
                } else {
                     throw new Error("Decryption returned empty");
                }
            } catch (e) {
                console.error("Crypto: Failed to decrypt E2EE backup. Incorrect password or corrupted data.", e);
                throw new Error("Unable to restore encryption keys.");
            }
        }

        // 3. Generate New Key (No backup exists, e.g. Signup or first-time E2EE setup)
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        const privateKey = new Uint8Array(randomBytes);
        const publicKey = x25519.getPublicKey(privateKey);
        const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
        
        // Create Backup
        const newSalt = Buffer.from(await Crypto.getRandomBytesAsync(16)).toString('hex');
        const kek = await deriveKEKFromPassword(password, newSalt);
        const encryptedPrivateKey = await encryptText(privateKeyBase64, kek);
        
        if (encryptedPrivateKey) {
            // Save Backup metadata to DB
            await supabase.from('profiles').update({
                encrypted_private_key: encryptedPrivateKey,
                kdf_salt: newSalt,
                kdf_algorithm: 'scrypt_N16384_r8_p1'
            }).eq('id', userId);
        }

        await SecureStore.setItemAsync(keyStoragePath, privateKeyBase64);
        return Buffer.from(publicKey).toString('base64');
    }

    // Fallback: No password, and no SecureStore key.
    throw new Error("Unable to restore encryption keys. Please log out and log back in with your password.");
}

/**
 * 🔑 Get True E2EE Shared Secret using X25519 Diffie-Hellman
 */
export async function getX25519SharedSecret(friendPublicKeyBase64: string, userId: string): Promise<Uint8Array | null> {
    const keyStoragePath = `e2ee_private_key_v1_${userId}`;
    const existingKey = await SecureStore.getItemAsync(keyStoragePath);
    if (!existingKey) return null;

    if (keyCache.has(friendPublicKeyBase64)) {
        return keyCache.get(friendPublicKeyBase64)!;
    }

    try {
        const privateKey = Buffer.from(existingKey, 'base64');
        const friendPublicKey = Buffer.from(friendPublicKeyBase64, 'base64');

        const sharedSecret = x25519.getSharedSecret(privateKey, friendPublicKey);
        
        // Hash it with PBKDF2 to ensure uniform 256-bit AES key format
        const key = await pbkdf2Async(sha256, sharedSecret, encoder.encode(SALT), {
            c: 1000,
            dkLen: 32 // 256 bits
        });
        
        keyCache.set(friendPublicKeyBase64, key);
        return key;
    } catch (e) {
        console.warn('X25519 shared secret generation failed', e);
        return null;
    }
}

/**
 * 🔑 Generate deterministic crypto key for a chat
 * Now updated to use X25519 Diffie-Hellman for 1-on-1 chats!
 */
export async function getChatKey(userId: string, friendId: string, isGroup: boolean = false): Promise<Uint8Array | null> {
    if (!userId || !friendId) {
        throw new Error("Invalid IDs for chat key");
    }

    if (!isGroup) {
        // True E2EE (X25519)
        const baseKeyCacheStr = `x25519:${userId}:${friendId}`;
        if (keyCache.has(baseKeyCacheStr)) return keyCache.get(baseKeyCacheStr)!;

        try {
            const { data } = await supabase.from('profiles').select('public_key').eq('id', friendId).single();
            if (data?.public_key) {
                const key = await getX25519SharedSecret(data.public_key, userId);
                if (key) {
                    keyCache.set(baseKeyCacheStr, key);
                    console.log(`Crypto: X25519 Key generated for friend ${friendId}`);
                    return key;
                }
            } else {
                console.warn(`Friend ${friendId} does not have a public key yet. Falling back to null.`);
            }
        } catch (e) {
            console.warn('Failed to fetch friend public key for E2EE', e);
        }
        return null;
    }

    // Fallback for groups
    const baseKey = `group_v6:${friendId}`;

    // ✅ Noble PBKDF2 Async - non-blocking for React Native UI
    const key = await pbkdf2Async(sha256, encoder.encode(baseKey), encoder.encode(SALT), {
        c: 1000,
        dkLen: 32 // 256 bits
    });

    const uintKey = new Uint8Array(key);
    keyCache.set(baseKey, uintKey);
    console.log(`Crypto: Group Key generated for ${baseKey.substring(0, 8)}`);
    return uintKey;
}

/**
 * 🔑 Generate a random 32-byte Status Master Key
 */
export async function generateStatusMasterKey(): Promise<Uint8Array> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return new Uint8Array(randomBytes);
}

/**
 * 🔒 Encrypt the Status Master Key with a friend's Public Key (Hybrid Encryption)
 */
export async function encryptKeyWithSharedSecret(masterKey: Uint8Array, friendPublicKeyBase64: string, userId: string): Promise<string | null> {
    const sharedSecret = await getX25519SharedSecret(friendPublicKeyBase64, userId);
    if (!sharedSecret) return null;
    
    // Convert Master Key to string (base64) so we can use existing encryptText
    const masterKeyBase64 = Buffer.from(masterKey).toString('base64');
    return await encryptText(masterKeyBase64, sharedSecret);
}

/**
 * 🔓 Decrypt the Status Master Key from a friend's Hybrid Encrypted string
 */
export async function decryptKeyWithSharedSecret(encryptedMasterKeyBase64: string, friendPublicKeyBase64: string, userId: string): Promise<Uint8Array | null> {
    const sharedSecret = await getX25519SharedSecret(friendPublicKeyBase64, userId);
    if (!sharedSecret) return null;
    
    const masterKeyBase64 = await decryptText(encryptedMasterKeyBase64, sharedSecret);
    if (!masterKeyBase64) return null;
    
    return new Uint8Array(Buffer.from(masterKeyBase64, 'base64'));
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
