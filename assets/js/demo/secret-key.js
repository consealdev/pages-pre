// The Secret Key tab: a random 128-bit Secret Key is a second factor for wrapping the account key. The passphrase alone
// doesn't unwrap it, and neither does the Secret Key alone.

import { decodeText, encodeText, sealedAsJson, wrappedKeyAsJson } from './format.js';
import { checkAll, clearStatus, completeStep, describe, find, findField, showError, showOk, unlockStep, whileBusy } from './ui.js';

/**
 * Wires the Secret Key tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireSecretKey(root, { conseal })
{
    const passphrase = findField(root, 'sk-pass');
    const message = findField(root, 'sk-message');
    const createButton = find(root, 'sk-create');
    const createStatus = find(root, 'sk-create-status');
    const created = find(root, 'sk-created');
    const keyOutput = findField(root, 'sk-key');
    const blobOutput = findField(root, 'sk-blob');
    const sealedOutput = findField(root, 'sk-sealed');

    const unlockCard = find(root, 'sk-step-unlock');
    const unlockButton = find(root, 'sk-unlock');
    const unlockStatus = find(root, 'sk-unlock-status');
    const unlocked = find(root, 'sk-unlocked');
    const unlockOutput = findField(root, 'sk-unlock-output');

    const attackCard = find(root, 'sk-step-attack');
    const attackButton = find(root, 'sk-attack');
    const attackStatus = find(root, 'sk-attack-status');

    const numbers = [1, 2, 3].map(number => find(root, `sk-num-${number}`));
    let state;

    createButton.addEventListener('click', async () =>
    {
        clearStatus(createStatus);
        const ready = checkAll(createStatus, [
            [passphrase.value !== '', 'Enter a passphrase.'],
            [message.value.trim() !== '', 'Enter a message to seal.'],
        ]);
        if (!ready) return;

        await whileBusy(createButton, 'Generating… (slow by design)', async () =>
        {
            try
            {
                const accountKey = await conseal.generateAesKey(true);
                const secretKey = conseal.generateSecretKey();
                const wrapped = await conseal.wrapKey(passphrase.value, accountKey, secretKey);
                const sealed = await conseal.seal(accountKey, encodeText(message.value));
                state = { passphrase: passphrase.value, secretKey, wrapped, sealed };

                keyOutput.value = conseal.toBase64(secretKey);
                blobOutput.value = wrappedKeyAsJson(conseal, wrapped);
                sealedOutput.value = sealedAsJson(conseal, sealed);
                created.hidden = false;
                completeStep(numbers[0]);
                unlockStep(unlockCard);
                showOk(createStatus, 'Account key wrapped with the passphrase and the Secret Key.');
            }
            catch (error)
            {
                showError(createStatus, describe(error));
            }
        });
    });

    unlockButton.addEventListener('click', async () =>
    {
        clearStatus(unlockStatus);

        await whileBusy(unlockButton, 'Unlocking… (slow by design)', async () =>
        {
            try
            {
                const accountKey = await conseal.unwrapKey(state.passphrase, state.wrapped.wrappedKey, state.wrapped.salt, state.secretKey);
                unlockOutput.value = decodeText(await conseal.unseal(accountKey, state.sealed.ciphertext, state.sealed.iv));
                unlocked.hidden = false;
                completeStep(numbers[1]);
                unlockStep(attackCard);
                showOk(unlockStatus, 'Decrypted with the right passphrase and Secret Key.');
            }
            catch (error)
            {
                showError(unlockStatus, describe(error));
            }
        });
    });

    attackButton.addEventListener('click', async () =>
    {
        clearStatus(attackStatus);

        await whileBusy(attackButton, 'Attempting… (slow by design)', async () =>
        {
            const wrongSecretKey = conseal.generateSecretKey();
            try
            {
                await conseal.unwrapKey(state.passphrase, state.wrapped.wrappedKey, state.wrapped.salt, wrongSecretKey);
            }
            catch
            {
                // The refusal is the result: the right passphrase with the wrong Secret Key doesn't unwrap the key
                completeStep(numbers[2]);
                showOk(attackStatus, 'Rejected, as it must be: the right passphrase with the wrong Secret Key. The passphrase alone is not enough.');
                return;
            }
            showError(attackStatus, 'Unexpected: the key unwrapped with the wrong Secret Key.');
        });
    });
}
