# Chat Warriors: End-to-End Encryption (E2EE) Architecture

This document outlines the zero-knowledge security architecture implemented in the Chat Warriors application. The system is designed to provide WhatsApp/Signal-level security, ensuring that messages remain completely private and inaccessible to anyone except the sender and recipient—including the database administrators.

## 1. Cryptographic Primitives
The application utilizes the following industry-standard cryptographic algorithms:
- **X25519 (Curve25519):** Elliptic-curve Diffie-Hellman (ECDH) for generating shared secrets.
- **AES-256-GCM:** Authenticated encryption for encrypting and decrypting message payloads.
- **Scrypt:** Memory-hard password-based key derivation function (KDF) to protect private keys.
- **SHA-256 / PBKDF2:** Hashing algorithms used in fallback and group chat encryption derivation.

## 2. Core E2EE Flow (Message Locking)
When User A sends a message to User B:
1. User A retrieves User B's **Public Key** from the Supabase database.
2. User A performs a Diffie-Hellman key exchange using their **Private Key** and User B's **Public Key** to generate a **Shared Secret**.
3. The message is encrypted using `AES-256-GCM` where the encryption key is derived from the Shared Secret.
4. User B receives the encrypted payload. They use their **Private Key** and User A's **Public Key** to independently derive the exact same **Shared Secret**, which unlocks the message.

## 3. Password-Protected Cloud Backup (The Vault)
To ensure users do not lose access to their E2EE messages when they log out or switch devices, a Key Wrapping technique is used.

### The Problem
Private keys must remain on the device. However, if a user logs in on a new device, they need their old private key to read past messages. Storing the plaintext private key in the cloud defeats the purpose of E2EE.

### The Solution (Key Wrapping)
1. **Key Generation:** When a user logs in or signs up on a new device, an X25519 Keypair is generated locally.
2. **Key-Encryption-Key (KEK):** The user's plaintext Login Password, combined with a random 128-bit salt, is passed through the memory-hard `Scrypt` algorithm to generate a KEK.
3. **The Vault:** The user's X25519 Private Key is encrypted using this KEK.
4. **Cloud Storage:** Only the **Encrypted Private Key** (The Vault) and the **Salt** are uploaded to the Supabase database. The plaintext password and plaintext private key never leave the device.

## 4. Multi-Device Sync & Lifecycle

- **Login:** Upon logging in, the app downloads the Encrypted Private Key from Supabase. It intercepts the user's password, runs `Scrypt` to derive the KEK, unlocks the Vault, and securely stores the Private Key in the device's hardware `SecureStore`. The plaintext password is then immediately wiped from memory.
- **Logout:** Logging out completely erases the Private Key from the device's `SecureStore`.
- **Auto-Login:** If an existing session is restored but the local `SecureStore` is empty (e.g., app data was cleared), the app will refuse to silently generate a new identity key. Instead, it forces the user to log out and log in again with their password to restore their cloud backup, preventing accidental message loss.

## Conclusion
This architecture guarantees that even in the event of a total database breach, attackers cannot decrypt user messages because the encryption keys are securely wrapped using a memory-hard password derivative that the server never stores.
