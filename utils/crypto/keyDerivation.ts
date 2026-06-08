import { scryptAsync } from '@noble/hashes/scrypt.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { encoder, SALT } from './globals';
import { keyCache } from './cache';

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
