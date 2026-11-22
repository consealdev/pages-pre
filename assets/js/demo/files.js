// The Files tab: a file sealed with a passcode into a .cnsl file, and a .cnsl file opened again. The file stays in the
// browser: it is read, sealed and offered as a download without leaving the page.

import { checkAll, clearStatus, describe, find, findField, isOperationError, showError, showOk, whileBusy } from './ui.js';

// The .cnsl layout, in bytes:
//   4   magic "CNSL"
//   1   version
//   2   length of the original file name (uint16, big endian)
//   N   the original file name, UTF-8
//   16  salt
//   12  iv
//   2   length of the wrapped key (uint16, big endian)
//   M   the wrapped key
//   …   the ciphertext
const MAGIC = [0x43, 0x4e, 0x53, 0x4c];
const VERSION = 1;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const MAX_FILE_BYTES = 1024 * 1024;

/** The bytes of a file that is meant to be a .cnsl file aren't one. */
export class CnslFormatError extends Error
{
    /**
     * @param {string} message what is wrong with the file
     */
    constructor(message)
    {
        super(message);
        this.name = 'CnslFormatError';
    }
}

/**
 * Packs a sealed file into the .cnsl layout.
 * @param {string} filename the original file's name
 * @param {Uint8Array} salt the salt of the passcode's key
 * @param {Uint8Array} iv the iv of the seal
 * @param {ArrayBuffer} wrappedKey the file's key, wrapped by the passcode's
 * @param {ArrayBuffer} ciphertext the sealed file
 * @returns {ArrayBuffer} the .cnsl file
 */
export function packCnsl(filename, salt, iv, wrappedKey, ciphertext)
{
    const name = new TextEncoder().encode(filename);
    const key = new Uint8Array(wrappedKey);
    const header = new Uint8Array(MAGIC.length + 1 + 2 + name.length + SALT_BYTES + IV_BYTES + 2 + key.length);
    let offset = 0;
    header.set(MAGIC, offset);
    offset += MAGIC.length;
    header[offset++] = VERSION;
    header[offset++] = (name.length >> 8) & 0xff;
    header[offset++] = name.length & 0xff;
    header.set(name, offset);
    offset += name.length;
    header.set(salt, offset);
    offset += SALT_BYTES;
    header.set(iv, offset);
    offset += IV_BYTES;
    header[offset++] = (key.length >> 8) & 0xff;
    header[offset++] = key.length & 0xff;
    header.set(key, offset);

    const packed = new Uint8Array(header.length + ciphertext.byteLength);
    packed.set(header);
    packed.set(new Uint8Array(ciphertext), header.length);
    return packed.buffer;
}

/**
 * Reads a .cnsl file.
 * @param {ArrayBuffer} buffer the file's bytes
 * @returns {{ filename: string, salt: Uint8Array, iv: Uint8Array, wrappedKey: ArrayBuffer, ciphertext: ArrayBuffer }} its parts
 * @throws {CnslFormatError} when the bytes aren't a .cnsl file of a version this reads
 */
export function unpackCnsl(buffer)
{
    const bytes = new Uint8Array(buffer);
    if (MAGIC.some((byte, index) => bytes[index] !== byte)) throw new CnslFormatError('Not a valid .cnsl file');

    let offset = MAGIC.length;
    const version = bytes[offset++];
    if (version !== VERSION) throw new CnslFormatError(`Unsupported .cnsl version: ${version}`);

    const nameLength = (bytes[offset++] << 8) | bytes[offset++];
    const filename = new TextDecoder().decode(bytes.slice(offset, offset + nameLength));
    offset += nameLength;
    const salt = bytes.slice(offset, offset + SALT_BYTES);
    offset += SALT_BYTES;
    const iv = bytes.slice(offset, offset + IV_BYTES);
    offset += IV_BYTES;
    const keyLength = (bytes[offset++] << 8) | bytes[offset++];
    const wrappedKey = bytes.slice(offset, offset + keyLength).buffer;
    offset += keyLength;
    return { filename, salt, iv, wrappedKey, ciphertext: buffer.slice(offset) };
}

/**
 * Offers bytes to the user as a download.
 * @param {ArrayBuffer} buffer the file's bytes
 * @param {string} filename the name the download gets
 */
function download(buffer, filename)
{
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * A size in bytes as the reader says it.
 * @param {number} bytes the size
 * @returns {string} the size with its unit
 */
function formatSize(bytes)
{
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Wires one drop area and its file input, and shows the chosen file's name and size.
 * @param {ParentNode} root the demo
 * @param {string} prefix `encrypt` or `decrypt`, the start of the ids of the area's elements
 * @returns {() => File | undefined} what the file chosen so far is
 */
function wireDropArea(root, prefix)
{
    const area = find(root, `${prefix}-drop`);
    const input = findField(root, `${prefix}-file`);
    const info = find(root, `${prefix}-file-info`);
    const name = find(root, `${prefix}-file-name`);
    const size = find(root, `${prefix}-file-size`);
    let chosen;

    const choose = file =>
    {
        chosen = file;
        name.textContent = file.name;
        size.textContent = formatSize(file.size);
        info.hidden = false;
    };

    // The area is a label round the file input, so a click or the keyboard opens the picker without a handler
    input.addEventListener('change', () =>
    {
        if (input.files?.[0]) choose(input.files[0]);
    });
    area.addEventListener('dragover', event =>
    {
        event.preventDefault();
        area.classList.add('is-dragging');
    });
    area.addEventListener('dragleave', () => area.classList.remove('is-dragging'));
    area.addEventListener('drop', event =>
    {
        event.preventDefault();
        area.classList.remove('is-dragging');
        const file = event.dataTransfer?.files[0];
        if (file) choose(file);
    });
    return () => chosen;
}

/**
 * Shows how far a step has got, or hides the bar.
 * @param {ParentNode} root the demo
 * @param {string} prefix `encrypt` or `decrypt`
 * @param {number | undefined} percent how far, or undefined to hide the bar
 */
function setProgress(root, prefix, percent)
{
    const bar = find(root, `${prefix}-progress`);
    bar.hidden = percent === undefined;
    find(root, `${prefix}-progress-fill`).style.width = `${percent ?? 0}%`;
}

/**
 * Wires the Files tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireFiles(root, { conseal })
{
    const encryptFile = wireDropArea(root, 'encrypt');
    const decryptFile = wireDropArea(root, 'decrypt');
    const encryptButton = find(root, 'encrypt-btn');
    const encryptStatus = find(root, 'encrypt-status');
    const decryptButton = find(root, 'decrypt-btn');
    const decryptStatus = find(root, 'decrypt-status');

    encryptButton.addEventListener('click', async () =>
    {
        const file = encryptFile();
        const passcode = findField(root, 'encrypt-passcode').value;
        clearStatus(encryptStatus);

        const ready = checkAll(encryptStatus, [
            [file !== undefined, 'Select a file to encrypt.'],
            [(file?.size ?? 0) <= MAX_FILE_BYTES, 'File exceeds the 1 MB limit.'],
            [passcode !== '', 'Enter a passcode.'],
        ]);
        if (!ready || !file) return;

        await whileBusy(encryptButton, 'Encrypting…', async () =>
        {
            try
            {
                setProgress(root, 'encrypt', 20);
                const plaintext = await file.arrayBuffer();
                setProgress(root, 'encrypt', 50);
                const { ciphertext, iv, wrappedKey, salt } = await conseal.sealEnvelope(plaintext, passcode);
                setProgress(root, 'encrypt', 90);
                download(packCnsl(file.name, salt, iv, wrappedKey, ciphertext), `${file.name}.cnsl`);
                setProgress(root, 'encrypt', 100);
                showOk(encryptStatus, `Encrypted. ${file.name}.cnsl was downloaded.`);
            }
            catch (error)
            {
                showError(encryptStatus, describe(error));
            }
            finally
            {
                setTimeout(() => setProgress(root, 'encrypt', undefined), 800);
            }
        });
    });

    decryptButton.addEventListener('click', async () =>
    {
        const file = decryptFile();
        const passcode = findField(root, 'decrypt-passcode').value;
        clearStatus(decryptStatus);

        const ready = checkAll(decryptStatus, [
            [file !== undefined, 'Select a .cnsl file to decrypt.'],
            [passcode !== '', 'Enter the passcode.'],
        ]);
        if (!ready || !file) return;

        await whileBusy(decryptButton, 'Decrypting…', async () =>
        {
            try
            {
                setProgress(root, 'decrypt', 20);
                const { filename, salt, iv, wrappedKey, ciphertext } = unpackCnsl(await file.arrayBuffer());
                setProgress(root, 'decrypt', 60);
                const plaintext = await conseal.unsealEnvelope({ ciphertext, iv, wrappedKey, salt }, passcode);
                setProgress(root, 'decrypt', 95);
                download(plaintext, filename);
                setProgress(root, 'decrypt', 100);
                showOk(decryptStatus, `Decrypted. ${filename} was downloaded.`);
            }
            catch (error)
            {
                showError(decryptStatus, isOperationError(error) ? 'Wrong passcode or corrupted file.' : describe(error));
            }
            finally
            {
                setTimeout(() => setProgress(root, 'decrypt', undefined), 800);
            }
        });
    });
}
