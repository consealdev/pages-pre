// The Sign tab: an ECDSA P-256 key pair, a document signed with the private key, and the signature checked with the
// public key. Changing the document or the signature shows the check failing.

import { abbreviate, encodeText, withFlippedByte } from './format.js';
import { clearStatus, describe, find, findField, hideVerdict, showError, showOk, showVerdict, whileBusy } from './ui.js';

/**
 * Wires the Sign tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireSign(root, { conseal })
{
    const keygenButton = find(root, 'sign-keygen');
    const regenerateButton = find(root, 'sign-regenerate');
    const keygenStatus = find(root, 'sign-keygen-status');
    const keysBox = find(root, 'sign-keys');
    const publicThumb = find(root, 'sign-pub-thumb');

    const documentField = findField(root, 'sign-document');
    const signButton = find(root, 'sign-sign');
    const signStatus = find(root, 'sign-status');
    const signatureBox = find(root, 'sign-sig-box');
    const signedOver = find(root, 'sign-sig-hash');
    const signatureOutput = find(root, 'sign-sig-value');

    const tamperStep = find(root, 'sign-step-tamper');
    const tamperDocumentButton = find(root, 'sign-tamper-doc');
    const tamperSignatureButton = find(root, 'sign-tamper-sig');
    const restoreButton = find(root, 'sign-restore');
    const tamperStatus = find(root, 'sign-tamper-status');

    const verifyStep = find(root, 'sign-step-verify');
    const verifyButton = find(root, 'sign-verify');
    const verdict = find(root, 'sign-verdict');

    let keys;
    let original;
    let current;
    let tamperedDocument = false;
    let tamperedSignature = false;

    /** Clears what a signature left, when the key changes. */
    function resetSigning()
    {
        signatureBox.hidden = true;
        tamperStep.hidden = true;
        verifyStep.hidden = true;
        hideVerdict(verdict);
        clearStatus(signStatus);
        clearStatus(tamperStatus);
    }

    /**
     * Shows a signature's start, marked when it was altered.
     * @param {ArrayBuffer} signature the signature
     * @param {boolean} altered whether it was tampered with
     */
    function showSignature(signature, altered)
    {
        signatureOutput.textContent = `${abbreviate(conseal.toBase64(signature), 48)}${altered ? ' (tampered)' : ''}`;
    }

    /** Makes the key pair, and again for a new one. */
    async function generateKeys()
    {
        clearStatus(keygenStatus);
        await whileBusy(keygenButton, 'Generating…', async () =>
        {
            try
            {
                keys = await conseal.generateECDSAKeyPair();
                const jwk = await conseal.exportPublicKeyAsJwk(keys.publicKey);
                publicThumb.textContent = `${abbreviate(jwk.x ?? '?', 22)} (x coordinate, P-256)`;
                keysBox.hidden = false;
                regenerateButton.hidden = false;
                documentField.disabled = false;
                signButton.disabled = false;
                showOk(keygenStatus, 'ECDSA P-256 key pair generated.');
                resetSigning();
            }
            catch (error)
            {
                showError(keygenStatus, describe(error));
            }
        });
    }

    keygenButton.addEventListener('click', generateKeys);
    regenerateButton.addEventListener('click', generateKeys);

    signButton.addEventListener('click', async () =>
    {
        if (!documentField.value.trim())
        {
            showError(signStatus, 'Enter a document to sign.');
            return;
        }
        clearStatus(signStatus);

        await whileBusy(signButton, 'Signing…', async () =>
        {
            try
            {
                const encoded = encodeText(documentField.value);
                const signature = await conseal.sign(keys.privateKey, encoded);
                original = { text: documentField.value, signature };
                current = { ...original };
                tamperedDocument = false;
                tamperedSignature = false;

                signedOver.textContent = `SHA-256 of ${encoded.byteLength} bytes`;
                showSignature(signature, false);
                signatureBox.hidden = false;
                tamperStep.hidden = false;
                verifyStep.hidden = false;
                restoreButton.hidden = true;
                tamperDocumentButton.disabled = false;
                tamperSignatureButton.disabled = false;
                hideVerdict(verdict);
                clearStatus(tamperStatus);
                showOk(signStatus, 'Document signed with the private key.');
            }
            catch (error)
            {
                showError(signStatus, describe(error));
            }
        });
    });

    tamperDocumentButton.addEventListener('click', () =>
    {
        if (tamperedDocument) return;

        current.text = `${original.text} `;
        tamperedDocument = true;
        documentField.value = current.text;
        tamperDocumentButton.disabled = true;
        restoreButton.hidden = false;
        hideVerdict(verdict);
        showError(tamperStatus, 'Document tampered: a trailing space was added. The signature no longer matches.');
    });

    tamperSignatureButton.addEventListener('click', () =>
    {
        if (tamperedSignature) return;

        current.signature = withFlippedByte(original.signature);
        tamperedSignature = true;
        showSignature(current.signature, true);
        tamperSignatureButton.disabled = true;
        restoreButton.hidden = false;
        hideVerdict(verdict);
        showError(tamperStatus, 'Signature tampered: its first byte was flipped. Verification will fail.');
    });

    restoreButton.addEventListener('click', () =>
    {
        current = { ...original };
        tamperedDocument = false;
        tamperedSignature = false;
        documentField.value = original.text;
        showSignature(original.signature, false);
        tamperDocumentButton.disabled = false;
        tamperSignatureButton.disabled = false;
        restoreButton.hidden = true;
        hideVerdict(verdict);
        clearStatus(tamperStatus);
    });

    verifyButton.addEventListener('click', async () =>
    {
        await whileBusy(verifyButton, 'Verifying…', async () =>
        {
            try
            {
                const valid = await conseal.verify(keys.publicKey, current.signature, encodeText(current.text));
                if (valid)
                {
                    showVerdict(verdict, true, 'Signature valid',
                        'The document has not changed since it was signed. The private key that matches this public key made the signature.');
                    return;
                }
                showVerdict(verdict, false, 'Signature invalid', invalidReason(tamperedDocument, tamperedSignature));
            }
            catch (error)
            {
                showVerdict(verdict, false, 'Verification error', describe(error));
            }
        });
    });
}

/**
 * Why a signature failed to verify, as far as the demo knows.
 * @param {boolean} documentChanged whether the document was tampered with
 * @param {boolean} signatureChanged whether the signature was tampered with
 * @returns {string} the reason
 */
function invalidReason(documentChanged, signatureChanged)
{
    if (documentChanged && signatureChanged) return 'Both the document and the signature were tampered with.';
    if (documentChanged) return 'The document changed after it was signed. Even one character breaks the signature.';
    if (signatureChanged) return 'The signature was altered. Any change to its bytes makes verification fail.';
    return 'Verification failed. The document or the signature does not match the key.';
}
