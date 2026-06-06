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
import { AppStorage } from '@/lib/storage';
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
    const keyStoragePath = `private_x25519_${userId}`;
    
    // 1. Check local AppStorage first (Auto-Login scenario)
    const existingKey = await AppStorage.getItemAsync(keyStoragePath);
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
                    
                    await AppStorage.setItemAsync(keyStoragePath, decryptedBase64);
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
            const { error } = await supabase.from('profiles').update({
                encrypted_private_key: encryptedPrivateKey,
                kdf_salt: newSalt,
                kdf_algorithm: 'scrypt_N16384_r8_p1'
            }).eq('id', userId);
            
            if (error) {
                console.error("Crypto: Failed to save backup to Supabase!", error);
            } else {
                console.log("Crypto: Successfully saved Cloud Backup to Supabase!");
            }
        }

        await AppStorage.setItemAsync(keyStoragePath, privateKeyBase64);
        return Buffer.from(publicKey).toString('base64');
    }

    // Fallback: No password, no AppStorage key — generate fresh keys (no cloud backup)
    // This happens on reinstall / data clear. Old messages won't be decryptable but new ones will work.
    console.warn('Crypto: No local key found and no password provided. Generating fresh X25519 keys (no cloud backup).');
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const privateKey = new Uint8Array(randomBytes);
    const publicKey = x25519.getPublicKey(privateKey);
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    await AppStorage.setItemAsync(keyStoragePath, privateKeyBase64);
    return Buffer.from(publicKey).toString('base64');
}

/**
 * 🔑 Get local private key
 */
export const getLocalPrivateKey = async (userId: string): Promise<Uint8Array | null> => {
    const keyStoragePath = `private_x25519_${userId}`;
    const existingKey = await AppStorage.getItemAsync(keyStoragePath);
    if (!existingKey) return null;
    return Buffer.from(existingKey, 'base64');
}

/**
 * 🔑 Get True E2EE Shared Secret using X25519 Diffie-Hellman
 */
export async function getX25519SharedSecret(friendPublicKeyBase64: string, userId: string): Promise<Uint8Array | null> {
    const privateKey = await getLocalPrivateKey(userId);
    if (!privateKey) return null;

    if (keyCache.has(friendPublicKeyBase64)) {
        return keyCache.get(friendPublicKeyBase64)!;
    }

    try {
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
 * 🔑 Get True E2EE Shared Secret using X25519 Diffie-Hellman for P2P Chats
 */
export async function getChatKey(userId: string, friendId: string, isGroup: boolean = false): Promise<Uint8Array | null> {
    if (!userId || !friendId) {
        throw new Error("Invalid IDs for chat key");
    }

    if (isGroup) {
        throw new Error("getChatKey cannot be used for groups in True E2EE mode. Use getGroupSenderKeyFromDB instead.");
    }

    // True E2EE (X25519)
    const baseKeyCacheStr = `x25519:${userId}:${friendId}`;
    if (keyCache.has(baseKeyCacheStr)) return keyCache.get(baseKeyCacheStr)!;

    // ✅ If our own private key is missing, auto-generate a fresh one
    const ownPrivateKey = await getLocalPrivateKey(userId);
    if (!ownPrivateKey) {
        console.warn('Crypto: Own private key missing! Auto-generating fresh key...');
        try {
            const randomBytes = await Crypto.getRandomBytesAsync(32);
            const privateKey = new Uint8Array(randomBytes);
            const publicKey = x25519.getPublicKey(privateKey);
            const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
            const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
            await AppStorage.setItemAsync(`private_x25519_${userId}`, privateKeyBase64);
            await supabase.from('profiles').update({ public_key: publicKeyBase64 }).eq('id', userId);
            console.log('Crypto: Fresh X25519 key pair generated and saved!');
        } catch (e) {
            console.error('Crypto: Failed to generate fresh key pair', e);
            throw new Error("E2EE Identity generation failed.");
        }
    }

    try {
        const { data } = await supabase.from('profiles').select('public_key').eq('id', friendId).single();
        if (data?.public_key) {
            const key = await getX25519SharedSecret(data.public_key, userId);
            if (key) {
                keyCache.set(baseKeyCacheStr, key);
                console.log(`Crypto: X25519 Key generated for friend ${friendId}`);
                return key;
            }
        }
    } catch (e) {
        console.warn('Failed to fetch friend public key for E2EE', e);
    }

    throw new Error(`E2EE: Target user ${friendId} has no public key. Secure connection aborted.`);
}

/**
 * 🔑 Legacy PBKDF2 Fallback for old group messages (Migration Dual-Mode)
 */
export async function getLegacyGroupKey(groupId: string): Promise<Uint8Array> {
    const baseKey = `group_v6:${groupId}`;
    if (keyCache.has(baseKey)) return keyCache.get(baseKey)!;

    const key = await pbkdf2Async(sha256, encoder.encode(baseKey), encoder.encode(SALT), {
        c: 1000,
        dkLen: 32 // 256 bits
    });

    const uintKey = new Uint8Array(key);
    keyCache.set(baseKey, uintKey);
    return uintKey;
}

// ==========================================
// 🛡️ TRUE E2EE SENDER-KEYS (FOR GROUPS)
// ==========================================

export async function getOrCreateMySenderKey(groupId: string, myId: string, forceRotate: boolean = false): Promise<{ key: Uint8Array, version: number }> {
    const storageKey = `sender_key_${groupId}`;
    const storageVerKey = `sender_version_${groupId}`;

    if (!forceRotate) {
        const existingKeyStr = await AppStorage.getItemAsync(storageKey);
        const existingVerStr = await AppStorage.getItemAsync(storageVerKey);
        if (existingKeyStr && existingVerStr) {
            return { key: Buffer.from(existingKeyStr, 'base64'), version: parseInt(existingVerStr, 10) };
        }
    }

    // Need to generate new key (Ratchet)
    let newVersion = 1;

    // Fetch highest version from DB to increment correctly
    const { data: latestKeyRow } = await supabase
        .from('group_sender_keys')
        .select('key_version')
        .eq('group_id', groupId)
        .eq('sender_id', myId)
        .order('key_version', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestKeyRow) {
        newVersion = latestKeyRow.key_version + 1;
        // Deactivate old keys
        await supabase
            .from('group_sender_keys')
            .update({ is_active: false })
            .eq('group_id', groupId)
            .eq('sender_id', myId);
    }

    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const newAesKey = new Uint8Array(randomBytes);
    
    await AppStorage.setItemAsync(storageKey, Buffer.from(newAesKey).toString('base64'));
    await AppStorage.setItemAsync(storageVerKey, newVersion.toString());

    return { key: newAesKey, version: newVersion };
}

export async function distributeSenderKey(groupId: string, myId: string, aesKey: Uint8Array, keyVersion: number, targetMemberIds: string[]): Promise<void> {
    if (targetMemberIds.length === 0) return;

    // Fetch public keys for all targets
    const { data: profiles } = await supabase.from('profiles').select('id, public_key').in('id', targetMemberIds);
    if (!profiles) return;

    const insertPayloads = [];

    for (const profile of profiles) {
        if (!profile.public_key) continue;

        // Encrypt our AES Sender Key for this specific member's eyes only
        const sharedSecret = await getX25519SharedSecret(profile.public_key, myId);
        if (!sharedSecret) continue;

        const aesKeyBase64 = Buffer.from(aesKey).toString('base64');
        const encryptedAESKey = await encryptText(aesKeyBase64, sharedSecret);

        if (encryptedAESKey) {
            insertPayloads.push({
                group_id: groupId,
                sender_id: myId,
                receiver_id: profile.id,
                encrypted_key: encryptedAESKey,
                key_version: keyVersion,
                is_active: true
            });
        }
    }

    if (insertPayloads.length > 0) {
        await supabase.from('group_sender_keys').insert(insertPayloads);
        console.log(`Crypto: Distributed Sender Key v${keyVersion} to ${insertPayloads.length} members in group ${groupId}`);
    }
}

export async function getDecryptedSenderKey(groupId: string, senderId: string, myId: string, keyVersion: number): Promise<Uint8Array | null> {
    const cacheStr = `group_key_${groupId}_${senderId}_v${keyVersion}`;
    if (keyCache.has(cacheStr)) return keyCache.get(cacheStr)!;

    // Fetch from DB
    const { data: keyRecord } = await supabase
        .from('group_sender_keys')
        .select('encrypted_key')
        .eq('group_id', groupId)
        .eq('sender_id', senderId)
        .eq('receiver_id', myId)
        .eq('key_version', keyVersion)
        .maybeSingle();

    if (!keyRecord || !keyRecord.encrypted_key) {
        console.warn(`Crypto: Missing sender key for ${senderId} in group ${groupId} (v${keyVersion})`);
        return null;
    }

    // Get sender's public key to derive shared secret
    const { data: profile } = await supabase.from('profiles').select('public_key').eq('id', senderId).single();
    if (!profile?.public_key) return null;

    const sharedSecret = await getX25519SharedSecret(profile.public_key, myId);
    if (!sharedSecret) return null;

    // Decrypt the AES Sender Key
    const decryptedBase64 = await decryptText(keyRecord.encrypted_key, sharedSecret);
    if (!decryptedBase64) return null;

    const aesKey = new Uint8Array(Buffer.from(decryptedBase64, 'base64'));
    keyCache.set(cacheStr, aesKey);
    return aesKey;
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
        // Fail gracefully - return placeholder, don't crash
        const errorMsg = '⚠️ Message cannot be decrypted (Keys changed)';
        if (typeof encryptedData === 'string' && encryptedData.startsWith('{')) return errorMsg;
        return typeof encryptedData === 'string' ? encryptedData : errorMsg;
    }
}
