// The Rekey tab: the passphrase that protects an account key is changed. The key itself stays the same, so what was sealed
// with it before still opens with the new passphrase.

import { decodeText, encodeText, sealedAsJson, wrappedKeyAsJson } from './format.js';
import { checkAll, clearStatus, completeStep, describe, find, findField, isOperationError, showError, showOk, unlockStep, whileBusy } from './ui.js';

/**
 * Wires the Rekey tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireRekey(root, { conseal })
{
    const passphrase = findField(root, 'rekey-pass');
    const message = findField(root, 'rekey-message');
    const createButton = find(root, 'rekey-create');
    const createStatus = find(root, 'rekey-create-status');
    const created = find(root, 'rekey-created');
    const blobBefore = findField(root, 'rekey-blob-before');
    const sealedOutput = findField(root, 'rekey-sealed');

    const rekeyStep = find(root, 'rekey-step-rekey');
    const oldPassphrase = findField(root, 'rekey-old-pass');
    const newPassphrase = findField(root, 'rekey-new-pass');
    const rekeyButton = find(root, 'rekey-run');
    const rekeyStatus = find(root, 'rekey-status');
    const rekeyResult = find(root, 'rekey-result');
    const compareBefore = findField(root, 'rekey-compare-before');
    const compareAfter = findField(root, 'rekey-compare-after');

    const verifyStep = find(root, 'rekey-step-verify');
    const verifyButton = find(root, 'rekey-verify');
    const verifyStatus = find(root, 'rekey-verify-status');
    const verifyResult = find(root, 'rekey-verified');
    const verifyOutput = findField(root, 'rekey-verify-output');

    const numbers = [1, 2, 3].map(number => find(root, `rekey-num-${number}`));
    let wrapped;
    let sealed;
    let currentPassphrase;

    createButton.addEventListener('click', async () =>
    {
        clearStatus(createStatus);
        const ready = checkAll(createStatus, [
            [passphrase.value !== '', 'Enter a passphrase.'],
            [message.value.trim() !== '', 'Enter a message to seal.'],
        ]);
        if (!ready) return;

        await whileBusy(createButton, 'Creating… (slow by design)', async () =>
        {
            try
            {
                const accountKey = await conseal.generateAesKey(true);
                wrapped = await conseal.wrapKey(passphrase.value, accountKey);
                sealed = await conseal.seal(accountKey, encodeText(message.value));

                blobBefore.value = wrappedKeyAsJson(conseal, wrapped);
                compareBefore.value = blobBefore.value;
                sealedOutput.value = sealedAsJson(conseal, sealed);
                oldPassphrase.value = passphrase.value;
                created.hidden = false;
                completeStep(numbers[0]);
                unlockStep(rekeyStep);
                showOk(createStatus, 'Account key created and the message sealed.');
            }
            catch (error)
            {
                showError(createStatus, describe(error));
            }
        });
    });

    rekeyButton.addEventListener('click', async () =>
    {
        clearStatus(rekeyStatus);
        const ready = checkAll(rekeyStatus, [
            [oldPassphrase.value !== '', 'Enter the old passphrase.'],
            [newPassphrase.value !== '', 'Enter a new passphrase.'],
            [oldPassphrase.value !== newPassphrase.value, 'The new passphrase must differ from the old one.'],
        ]);
        if (!ready) return;

        await whileBusy(rekeyButton, 'Rekeying… (slow by design)', async () =>
        {
            try
            {
                wrapped = await conseal.rekey(oldPassphrase.value, newPassphrase.value, wrapped.wrappedKey, wrapped.salt);
                currentPassphrase = newPassphrase.value;

                compareAfter.value = wrappedKeyAsJson(conseal, wrapped);
                rekeyResult.hidden = false;
                completeStep(numbers[1]);
                unlockStep(verifyStep);
                showOk(rekeyStatus, 'Rekeyed. The wrapped key has new bytes, with the same account key inside.');
            }
            catch (error)
            {
                showError(rekeyStatus, isOperationError(error) ? 'Wrong old passphrase.' : describe(error));
            }
        });
    });

    verifyButton.addEventListener('click', async () =>
    {
        clearStatus(verifyStatus);

        await whileBusy(verifyButton, 'Unsealing… (slow by design)', async () =>
        {
            try
            {
                const accountKey = await conseal.unwrapKey(currentPassphrase, wrapped.wrappedKey, wrapped.salt);
                verifyOutput.value = decodeText(await conseal.unseal(accountKey, sealed.ciphertext, sealed.iv));
                verifyResult.hidden = false;
                completeStep(numbers[2]);
                showOk(verifyStatus, 'Unsealed with the new passphrase. What was sealed before the rekey still opens.');
            }
            catch (error)
            {
                showError(verifyStatus, describe(error));
            }
        });
    });
}
