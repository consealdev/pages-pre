// What the demo's tabs share: finding an element, the line of status under a button, a button that shows it is working,
// the steps of a tab, and copying text. Plain JS, served as it is: the home page has no build step.

/** The demo's markup lacks an element the script looks for. */
export class DemoMarkupError extends Error
{
    /**
     * @param {string} id the id the script looked for
     */
    constructor(id)
    {
        super(`The demo has no element with the id "${id}"`);
        this.name = 'DemoMarkupError';
    }
}

/**
 * Finds an element of the demo.
 * @param {ParentNode} root the demo
 * @param {string} id the element's id
 * @returns {HTMLElement} the element
 * @throws {DemoMarkupError} when the demo has none
 */
export function find(root, id)
{
    const element = root.querySelector(`#${id}`);
    if (!(element instanceof HTMLElement)) throw new DemoMarkupError(id);
    return element;
}

/**
 * Finds a field of the demo, one that has a value.
 * @param {ParentNode} root the demo
 * @param {string} id the field's id
 * @returns {HTMLInputElement | HTMLTextAreaElement} the field
 * @throws {DemoMarkupError} when the demo has no such field
 */
export function findField(root, id)
{
    const element = find(root, id);
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) throw new DemoMarkupError(id);
    return element;
}

/**
 * Shows that a step worked, in the line under its button.
 * @param {HTMLElement} status the line
 * @param {string} message what happened
 */
export function showOk(status, message)
{
    status.className = 'status ok';
    status.textContent = message;
}

/**
 * Shows that a step failed, in the line under its button.
 * @param {HTMLElement} status the line
 * @param {string} message what went wrong
 */
export function showError(status, message)
{
    status.className = 'status error';
    status.textContent = message;
}

/**
 * Empties the line under a button.
 * @param {HTMLElement} status the line
 */
export function clearStatus(status)
{
    status.className = 'status';
    status.textContent = '';
}

/**
 * Checks what a step needs before it runs, and shows the first thing that is missing.
 * @param {HTMLElement} status the line to show it in
 * @param {[boolean, string][]} checks each one whether it holds, and what to say when it doesn't
 * @returns {boolean} whether every check holds
 */
export function checkAll(status, checks)
{
    const failed = checks.find(([holds]) => !holds);
    if (failed) showError(status, failed[1]);
    return !failed;
}

/**
 * What an error says, for the line under a button.
 * @param {unknown} error what was thrown
 * @returns {string} its message
 */
export function describe(error)
{
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Whether SubtleCrypto refused a key or a ciphertext: a wrong passphrase, a wrong key, or bytes that were changed.
 * @param {unknown} error what was thrown
 * @returns {boolean} whether it is an OperationError
 */
export function isOperationError(error)
{
    return error instanceof Error && error.name === 'OperationError';
}

/**
 * Runs a step with its button disabled and its label changed, and puts both back after.
 * @template T
 * @param {HTMLElement} button the button that started it
 * @param {string} workingLabel what the button says meanwhile
 * @param {() => Promise<T>} task the step
 * @returns {Promise<T>} what the step returned
 */
export async function whileBusy(button, workingLabel, task)
{
    const label = button.textContent;
    button.toggleAttribute('disabled', true);
    button.textContent = workingLabel;
    try
    {
        return await task();
    }
    finally
    {
        button.toggleAttribute('disabled', false);
        button.textContent = label;
    }
}

/**
 * Shows the outcome of a signature check: a mark, a headline and, where there is one, what it means.
 * @param {HTMLElement} verdict the banner
 * @param {boolean} valid whether the signature verified
 * @param {string} headline what the banner says
 * @param {string} [detail] a line under it
 */
export function showVerdict(verdict, valid, headline, detail = '')
{
    verdict.hidden = false;
    verdict.dataset.state = valid ? 'valid' : 'invalid';
    verdict.querySelector('.demo-verdict-icon').textContent = valid ? '✓' : '✗';
    verdict.querySelector('.demo-verdict-headline').textContent = headline;
    verdict.querySelector('.demo-verdict-detail').textContent = detail;
}

/**
 * Hides a banner that showed the outcome of a signature check.
 * @param {HTMLElement} verdict the banner
 */
export function hideVerdict(verdict)
{
    verdict.hidden = true;
    delete verdict.dataset.state;
}

/**
 * Marks a step's number as done.
 * @param {HTMLElement} number the step's number
 */
export function completeStep(number)
{
    number.classList.add('is-done');
}

/**
 * Opens the next step. A step that isn't open can't be used, by the mouse or the keyboard.
 * @param {HTMLElement} step the step's card
 */
export function unlockStep(step)
{
    step.inert = false;
}

/**
 * Copies text to the clipboard, and says so on the button for a moment.
 * @param {HTMLElement} button the button that was pressed
 * @param {string} text what to copy
 */
export async function copyWithFeedback(button, text)
{
    const label = button.textContent;
    try
    {
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied';
    }
    catch
    {
        // The browser refused: the page isn't focused, or the permission is denied
        button.textContent = 'Copy failed';
    }
    setTimeout(() =>
    {
        button.textContent = label;
    }, 1500);
}
