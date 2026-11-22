// The P2P tab: Alice and Bob each make an ECDH key pair, to encrypt to, and an ECDSA key pair, to sign with. Alice seals
// a message to Bob's public key and signs it. Bob checks her signature and opens it with his private key. Tampering with
// the signature shows the check failing.

import { abbreviate, decodeText, encodeText, withFlippedByte } from './format.js';
import { clearStatus, describe, find, findField, hideVerdict, showError, showOk, showVerdict, whileBusy } from './ui.js';

/**
 * Wires the P2P tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireP2p(root, { conseal })
{
    const identities = { alice: {}, bob: {} };
    let packet;

    const aliceMessage = findField(root, 'alice-message');
    const aliceSend = find(root, 'alice-send');
    const aliceSendStatus = find(root, 'alice-send-status');
    const packetBox = find(root, 'p2p-packet');
    const packetEmpty = find(root, 'p2p-packet-empty');
    const ciphertextOutput = find(root, 'p2p-ciphertext');
    const ivOutput = find(root, 'p2p-iv');
    const ephemeralOutput = find(root, 'p2p-ephemeral');
    const signatureOutput = find(root, 'p2p-signature');
    const unsealButton = find(root, 'p2p-unseal');
    const tamperButton = find(root, 'p2p-tamper');
    const verdict = find(root, 'p2p-verdict');
    const unsealStatus = find(root, 'p2p-unseal-status');
    const received = findField(root, 'p2p-received');

    /** Opens the message box once both have keys. */
    function enableComposing()
    {
        const ready = identities.alice.ecdh && identities.bob.ecdh;
        aliceMessage.disabled = !ready;
        aliceSend.disabled = !ready;
    }

    /**
     * Makes a person's two key pairs and shows the start of each public key.
     * @param {'alice' | 'bob'} who the person
     */
    async function generateIdentity(who)
    {
        const button = find(root, `${who}-keygen`);
        const status = find(root, `${who}-keygen-status`);
        clearStatus(status);

        await whileBusy(button, 'Generating…', async () =>
        {
            try
            {
                const ecdh = await conseal.generateECDHKeyPair();
                const ecdsa = await conseal.generateECDSAKeyPair();
                identities[who] = { ecdh, ecdsa };

                const ecdhJwk = await conseal.exportPublicKeyAsJwk(ecdh.publicKey);
                const ecdsaJwk = await conseal.exportPublicKeyAsJwk(ecdsa.publicKey);
                find(root, `${who}-ecdh-thumb`).textContent = abbreviate(ecdhJwk.x ?? '?', 12);
                find(root, `${who}-ecdsa-thumb`).textContent = abbreviate(ecdsaJwk.x ?? '?', 12);
                find(root, `${who}-keys`).hidden = false;

                showOk(status, 'ECDH and ECDSA key pairs generated.');
                enableComposing();
            }
            catch (error)
            {
                showError(status, describe(error));
            }
        });
    }

    find(root, 'alice-keygen').addEventListener('click', () => generateIdentity('alice'));
    find(root, 'bob-keygen').addEventListener('click', () => generateIdentity('bob'));

    aliceSend.addEventListener('click', async () =>
    {
        const text = aliceMessage.value.trim();
        if (!text)
        {
            showError(aliceSendStatus, 'Enter a message first.');
            return;
        }
        clearStatus(aliceSendStatus);

        await whileBusy(aliceSend, 'Sealing…', async () =>
        {
            try
            {
                const { ciphertext, iv, ephemeralPublicKey } = await conseal.sealMessage(identities.bob.ecdh.publicKey, encodeText(text));
                const signature = await conseal.sign(identities.alice.ecdsa.privateKey, ciphertext);
                packet = { ciphertext, iv, ephemeralPublicKey, signature };

                ciphertextOutput.textContent = abbreviate(conseal.toBase64(ciphertext), 32);
                ivOutput.textContent = conseal.toBase64(iv);
                ephemeralOutput.textContent = abbreviate(ephemeralPublicKey.x ?? '?', 20);
                signatureOutput.textContent = abbreviate(conseal.toBase64(signature), 32);
                packetBox.hidden = false;
                packetEmpty.hidden = true;
                unsealButton.disabled = false;
                tamperButton.disabled = false;
                tamperButton.textContent = 'Tamper signature';
                hideVerdict(verdict);
                received.value = '';
                clearStatus(unsealStatus);

                showOk(aliceSendStatus, 'Message sealed to Bob\'s public key and signed with Alice\'s private key.');
            }
            catch (error)
            {
                showError(aliceSendStatus, describe(error));
            }
        });
    });

    tamperButton.addEventListener('click', () =>
    {
        if (!packet) return;

        packet.signature = withFlippedByte(packet.signature);
        signatureOutput.textContent = `${abbreviate(conseal.toBase64(packet.signature), 32)} (tampered)`;
        tamperButton.textContent = 'Signature tampered';
        tamperButton.disabled = true;
        hideVerdict(verdict);
        received.value = '';
        clearStatus(unsealStatus);
    });

    unsealButton.addEventListener('click', async () =>
    {
        if (!packet) return;

        clearStatus(unsealStatus);
        received.value = '';
        hideVerdict(verdict);

        await whileBusy(unsealButton, 'Verifying…', async () =>
        {
            try
            {
                const { ciphertext, iv, ephemeralPublicKey, signature } = packet;
                const valid = await conseal.verify(identities.alice.ecdsa.publicKey, signature, ciphertext);
                if (!valid)
                {
                    showVerdict(verdict, false, 'Signature invalid. The message is rejected.');
                    showError(unsealStatus, 'Signature check failed: the message was changed, or did not come from Alice.');
                    return;
                }

                showVerdict(verdict, true, 'Signature valid. The message is from Alice.');
                received.value = decodeText(await conseal.unsealMessage(identities.bob.ecdh.privateKey, ciphertext, iv, ephemeralPublicKey));
                showOk(unsealStatus, 'Signature verified and the message decrypted.');
            }
            catch (error)
            {
                showError(unsealStatus, describe(error));
            }
        });
    });
}
