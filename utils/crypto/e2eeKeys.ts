import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { x25519 } from '@noble/curves/ed25519';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { encoder, SALT } from './globals';
import { keyCache } from './cache';
import { deriveKEKFromPassword } from './keyDerivation';
import { encryptText, decryptText } from './aesGcm';

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

    const cacheKey = `x25519_pk:${userId}:${friendPublicKeyBase64}`;
    if (keyCache.has(cacheKey)) {
        return keyCache.get(cacheKey)!;
    }

    try {
        const friendPublicKey = Buffer.from(friendPublicKeyBase64, 'base64');

        const sharedSecret = x25519.getSharedSecret(privateKey, friendPublicKey);
        
        // Hash it with PBKDF2 to ensure uniform 256-bit AES key format
        const key = await pbkdf2Async(sha256, sharedSecret, encoder.encode(SALT), {
            c: 1000,
            dkLen: 32 // 256 bits
        });
        
        keyCache.set(cacheKey, key);
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

    // ✅ OFFLINE FIX: If requesting our own key, we don't need network
    if (userId === friendId) {
        const pk = await getLocalPrivateKey(userId);
        if (pk) {
            const publicKey = x25519.getPublicKey(pk);
            const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
            const key = await getX25519SharedSecret(publicKeyBase64, userId);
            if (key) {
                keyCache.set(baseKeyCacheStr, key);
                return key;
            }
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
