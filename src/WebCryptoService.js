// E2EE zero-knowledge implementation
export class WebCryptoService {
    /**
     * Generates a new AES-GCM 256-bit symmetric key
     * @returns {Promise<CryptoKey>}
     */
    static async generateKey() {
        return window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypts a File into a Blob using AES-GCM
     * @param {File} file
     * @param {CryptoKey} key
     * @returns {Promise<{ encryptedBlob: Blob, iv: Uint8Array }>}
     */
    static async encryptFile(file, key) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const arrayBuffer = await file.arrayBuffer();

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            arrayBuffer
        );

        return {
            encryptedBlob: new Blob([encryptedBuffer]),
            iv
        };
    }

    /**
     * Decrypts an ArrayBuffer/Blob using AES-GCM
     * @param {ArrayBuffer} encryptedData
     * @param {CryptoKey} key
     * @param {Uint8Array} iv
     * @returns {Promise<Blob>}
     */
    static async decryptFile(encryptedData, key, iv, mimeType = 'application/octet-stream') {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
        );

        return new Blob([decryptedBuffer], { type: mimeType });
    }

    /**
     * Exports the CryptoKey, IV and Original Metadata into a Base64 string for URL hash
     */
    static async exportToHash(key, iv, originalName, mimeType) {
        const exportedKey = await window.crypto.subtle.exportKey('raw', key);
        const keyStr = BufferToBase64Url(exportedKey);
        const ivStr = BufferToBase64Url(iv);

        // Obscure original name & mime within the hash so backend never sees it
        const nameStr = Utf8ToBase64Url(originalName || 'file.dat');
        const mimeStr = Utf8ToBase64Url(mimeType || 'application/octet-stream');

        // We use ':' as the separator because base64Url format uses both '-' and '_' naturally
        return `${keyStr}:${ivStr}:${nameStr}:${mimeStr}`;
    }

    /**
     * Imports the CryptoKey and Metadata from a hash string
     */
    static async importFromHash(hashString) {
        let rawHash = hashString.startsWith('#') ? hashString.substring(1) : hashString;
        // Keep backward compatibility (if the legacy token doesn't have colons) or fallback to dash logic
        const delim = rawHash.includes(':') ? ':' : '-';
        const parts = rawHash.split(delim);
        if (parts.length < 4) throw new Error('Invalid or corrupted link');

        const [keyB64, ivB64, nameB64, mimeB64] = parts;

        const keyBuffer = Base64UrlToBuffer(keyB64);
        const iv = Base64UrlToBuffer(ivB64);

        const key = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        return {
            key,
            iv: new Uint8Array(iv),
            originalName: Base64UrlToUtf8(nameB64),
            mimeType: Base64UrlToUtf8(mimeB64)
        };
    }
}

// Helpers
function BufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    // process in chunks to avoid max call stack size on huge arrays (if ever needed)
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function Base64UrlToBuffer(b64Url) {
    let b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function Utf8ToBase64Url(str) {
    // encodeURIComponent handles UTF-8 appropriately before btoa
    const utf8str = typeof window !== 'undefined' ? unescape(encodeURIComponent(str)) : str;
    return btoa(utf8str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function Base64UrlToUtf8(b64Url) {
    let b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const utf8str = atob(b64);
    return decodeURIComponent(escape(utf8str));
}
