export const keyCache = new Map<string, Uint8Array>();

export function clearCryptoCache() {
    keyCache.clear();
}
