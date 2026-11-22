// Text and key material as the demo handles and shows them.

/**
 * Text as the bytes Conseal seals.
 * @param {string} text the text
 * @returns {ArrayBuffer} its UTF-8 bytes
 */
export function encodeText(text)
{
    return new TextEncoder().encode(text).buffer;
}

/**
 * Bytes as the text they were made from.
 * @param {ArrayBuffer} buffer UTF-8 bytes
 * @returns {string} the text
 */
export function decodeText(buffer)
{
    return new TextDecoder().decode(buffer);
}

/**
 * A sealed value as the JSON a server would store.
 * @param {typeof globalThis.conseal} conseal the library
 * @param {{ ciphertext: ArrayBuffer, iv: Uint8Array }} sealed what `seal` returned
 * @returns {string} the JSON, its bytes in base64
 */
export function sealedAsJson(conseal, { ciphertext, iv })
{
    return JSON.stringify({ ciphertext: conseal.toBase64(ciphertext), iv: conseal.toBase64(iv) }, null, 2);
}

/**
 * A wrapped key as the JSON a server would store.
 * @param {typeof globalThis.conseal} conseal the library
 * @param {{ wrappedKey: ArrayBuffer, salt: Uint8Array }} wrapped what `wrapKey` or `rekey` returned
 * @returns {string} the JSON, its bytes in base64
 */
export function wrappedKeyAsJson(conseal, { wrappedKey, salt })
{
    return JSON.stringify({ wrappedKey: conseal.toBase64(wrappedKey), salt: conseal.toBase64(salt) }, null, 2);
}

/**
 * A copy of a signature with its first byte flipped, which no key verifies.
 * @param {ArrayBuffer} signature the signature
 * @returns {ArrayBuffer} the altered copy
 */
export function withFlippedByte(signature)
{
    const copy = signature.slice(0);
    new Uint8Array(copy)[0] ^= 0xff;
    return copy;
}

/**
 * The start of a long base64 value, for showing it in a line.
 * @param {string} value the value
 * @param {number} length how many characters to keep
 * @returns {string} the start, with an ellipsis
 */
export function abbreviate(value, length)
{
    return `${value.slice(0, length)}…`;
}
