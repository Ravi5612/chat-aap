import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { getX25519SharedSecret } from './e2eeKeys';
import { encryptText, decryptText } from './aesGcm';

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
