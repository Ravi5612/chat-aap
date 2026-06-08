import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import { AppStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { keyCache } from './cache';
import { getX25519SharedSecret } from './e2eeKeys';
import { encryptText, decryptText } from './aesGcm';

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
