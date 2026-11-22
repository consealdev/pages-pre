// The Seal tab: text sealed with a passcode into an envelope, and the envelope opened again. The passcode is turned into
// a key with PBKDF2, and the text is sealed with AES-256-GCM under a key of its own.

import { decodeText, encodeText } from './format.js';
import { checkAll, clearStatus, copyWithFeedback, describe, find, findField, isOperationError, showError, showOk, whileBusy } from './ui.js';

/**
 * Wires the Seal tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireSeal(root, { conseal })
{
    const plaintext = findField(root, 'seal-plain');
    const passcode = findField(root, 'seal-passcode');
    const sealButton = find(root, 'seal-btn');
    const sealStatus = find(root, 'seal-status');
    const sealed = findField(root, 'seal-output');
    const copyButton = find(root, 'seal-copy');

    const payload = findField(root, 'unseal-input');
    const unsealPasscode = findField(root, 'unseal-passcode');
    const unsealButton = find(root, 'unseal-btn');
    const unsealStatus = find(root, 'unseal-status');
    const unsealed = findField(root, 'unseal-output');

    sealButton.addEventListener('click', async () =>
    {
        clearStatus(sealStatus);
        sealed.value = '';
        copyButton.hidden = true;

        const ready = checkAll(sealStatus, [
            [plaintext.value.trim() !== '', 'Enter some text to encrypt.'],
            [passcode.value !== '', 'Enter a passcode.'],
        ]);
        if (!ready) return;

        await whileBusy(sealButton, 'Sealing…', async () =>
        {
            try
            {
                const envelope = await conseal.sealEnvelope(encodeText(plaintext.value), passcode.value);
                sealed.value = conseal.encodeEnvelope(envelope);
                copyButton.hidden = false;
                showOk(sealStatus, 'Sealed. Copy the payload and paste it into the Unseal box.');
            }
            catch (error)
            {
                showError(sealStatus, describe(error));
            }
        });
    });

    copyButton.addEventListener('click', () => copyWithFeedback(copyButton, sealed.value));

    unsealButton.addEventListener('click', async () =>
    {
        clearStatus(unsealStatus);
        unsealed.value = '';

        const ready = checkAll(unsealStatus, [
            [payload.value.trim() !== '', 'Paste an encrypted payload.'],
            [unsealPasscode.value !== '', 'Enter the passcode.'],
        ]);
        if (!ready) return;

        await whileBusy(unsealButton, 'Unsealing…', async () =>
        {
            try
            {
                const { ciphertext, iv, wrappedKey, salt } = conseal.decodeEnvelope(payload.value.trim());
                unsealed.value = decodeText(await conseal.unsealEnvelope({ ciphertext, iv, wrappedKey, salt }, unsealPasscode.value));
                showOk(unsealStatus, 'Unsealed successfully.');
            }
            catch (error)
            {
                showError(unsealStatus, unsealMessage(error));
            }
        });
    });
}

/**
 * What to tell the reader when an envelope didn't open.
 * @param {unknown} error what was thrown
 * @returns {string} the message
 */
function unsealMessage(error)
{
    if (isOperationError(error) || (error instanceof Error && error.message.includes('unwrap'))) return 'Wrong passcode or corrupted payload.';
    if (error instanceof SyntaxError) return 'Invalid payload — expected JSON.';
    return describe(error);
}
