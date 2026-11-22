// The Account tab: an account key made from a 24-word BIP-39 mnemonic and wrapped by a passphrase, a message sealed with
// it, and the key recovered from the mnemonic alone to open the message again.

import { decodeText, encodeText, sealedAsJson, wrappedKeyAsJson } from './format.js';
import { checkAll, clearStatus, completeStep, copyWithFeedback, describe, find, findField, isOperationError, showError, showOk, unlockStep, whileBusy } from './ui.js';

/**
 * Wires the Account tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireAccount(root, { conseal })
{
    const passphrase = findField(root, 'account-pass');
    const createButton = find(root, 'account-create');
    const createStatus = find(root, 'account-create-status');
    const created = find(root, 'account-created');
    const mnemonicOutput = findField(root, 'account-mnemonic');
    const wrappedOutput = findField(root, 'account-wrapped');
    const copyMnemonicButton = find(root, 'account-copy-mnemonic');
    const fillMnemonicButton = find(root, 'account-fill-mnemonic');

    const sealStep = find(root, 'account-step-seal');
    const message = findField(root, 'account-message');
    const sealButton = find(root, 'account-seal');
    const sealStatus = find(root, 'account-seal-status');
    const sealedResult = find(root, 'account-sealed');
    const sealedOutput = findField(root, 'account-sealed-output');

    const recoverStep = find(root, 'account-step-recover');
    const recoverMnemonic = findField(root, 'account-recover-mnemonic');
    const recoverButton = find(root, 'account-recover');
    const recoverStatus = find(root, 'account-recover-status');
    const recoveredResult = find(root, 'account-recovered');
    const recoveredOutput = findField(root, 'account-recovered-output');

    const numbers = [1, 2, 3].map(number => find(root, `account-num-${number}`));
    let accountKey;
    let mnemonic = '';
    let sealed;

    createButton.addEventListener('click', async () =>
    {
        clearStatus(createStatus);
        if (!checkAll(createStatus, [[passphrase.value !== '', 'Enter a passphrase.']])) return;

        await whileBusy(createButton, 'Creating…', async () =>
        {
            try
            {
                mnemonic = conseal.generateMnemonic();
                // The account key is made from the words, so the same words make it again. It is extractable only to be wrapped.
                accountKey = await conseal.recoverWithMnemonic(mnemonic, true);
                const wrapped = await conseal.wrapKey(passphrase.value, accountKey);

                mnemonicOutput.value = mnemonic;
                wrappedOutput.value = wrappedKeyAsJson(conseal, wrapped);
                created.hidden = false;
                fillMnemonicButton.hidden = false;
                completeStep(numbers[0]);
                unlockStep(sealStep);
                showOk(createStatus, 'Account key created. Save the mnemonic before you continue.');
            }
            catch (error)
            {
                showError(createStatus, describe(error));
            }
        });
    });

    copyMnemonicButton.addEventListener('click', () => copyWithFeedback(copyMnemonicButton, mnemonicOutput.value));

    sealButton.addEventListener('click', async () =>
    {
        clearStatus(sealStatus);
        const ready = checkAll(sealStatus, [
            [message.value.trim() !== '', 'Enter a message to seal.'],
            [accountKey !== undefined, 'Create an account first.'],
        ]);
        if (!ready) return;

        await whileBusy(sealButton, 'Sealing…', async () =>
        {
            try
            {
                sealed = await conseal.seal(accountKey, encodeText(message.value));
                sealedOutput.value = sealedAsJson(conseal, sealed);
                sealedResult.hidden = false;
                completeStep(numbers[1]);
                unlockStep(recoverStep);
                showOk(sealStatus, 'Message sealed. Now recover the key from the mnemonic.');
            }
            catch (error)
            {
                showError(sealStatus, describe(error));
            }
        });
    });

    fillMnemonicButton.addEventListener('click', () =>
    {
        recoverMnemonic.value = mnemonic;
    });

    recoverButton.addEventListener('click', async () =>
    {
        clearStatus(recoverStatus);
        const words = recoverMnemonic.value.trim().replace(/\s+/g, ' ');
        const ready = checkAll(recoverStatus, [
            [words !== '', 'Enter the recovery mnemonic.'],
            [sealed !== undefined, 'Seal a message first, in step 2.'],
        ]);
        if (!ready || !sealed) return;

        await whileBusy(recoverButton, 'Recovering…', async () =>
        {
            try
            {
                const recoveredKey = await conseal.recoverWithMnemonic(words);
                recoveredOutput.value = decodeText(await conseal.unseal(recoveredKey, sealed.ciphertext, sealed.iv));
                recoveredResult.hidden = false;
                completeStep(numbers[2]);
                showOk(recoverStatus, 'Key recovered from the mnemonic. The message opened.');
            }
            catch (error)
            {
                showError(recoverStatus, isOperationError(error) ? 'Wrong mnemonic: the message did not open.' : describe(error));
            }
        });
    });
}
