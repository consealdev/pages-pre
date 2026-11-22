// The JWK tab: a public key as a JSON Web Key is generated or pasted, checked as a point on its curve, and shown field
// by field with a SHA-256 fingerprint of its raw public point.

import { clearStatus, describe, find, findField, showError, showOk, whileBusy } from './ui.js';

/** The order the fields are listed in, and the rest after them */
const FIELD_ORDER = ['kty', 'crv', 'use', 'alg', 'key_ops', 'kid', 'ext', 'x', 'y'];

/**
 * A public key that can't be inspected.
 */
export class JwkError extends Error
{
    /**
     * @param {string} message what is wrong with the key
     */
    constructor(message)
    {
        super(message);
        this.name = 'JwkError';
    }
}

/**
 * Bytes as hex.
 * @param {ArrayBuffer | Uint8Array} bytes the bytes
 * @returns {string} two lowercase hex digits for each
 */
function toHex(bytes)
{
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * A fingerprint as groups of four digits, which are easier to compare by eye.
 * @param {string} hex the fingerprint
 * @returns {string} the groups, uppercase, with a space between
 */
function groupFingerprint(hex)
{
    return (hex.match(/.{1,4}/g) ?? []).join(' ').toUpperCase();
}

/**
 * Wires the JWK tab.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded libraries
 */
export function wireJwk(root, { conseal })
{
    const input = findField(root, 'jwk-input');
    const inspectButton = find(root, 'jwk-inspect');
    const clearButton = find(root, 'jwk-clear');
    const status = find(root, 'jwk-status');
    const resultCard = find(root, 'jwk-result');
    const fields = find(root, 'jwk-fields');
    const fingerprint = find(root, 'jwk-fingerprint');

    /** How each field reads: its label, and what its value means. */
    const fieldDocs = {
        kty: { label: 'Key type', describe: value => (value === 'EC' ? 'Elliptic curve' : value) },
        crv: { label: 'Curve', describe: value => value },
        x: { label: 'Public point X', describe: describeCoordinate },
        y: { label: 'Public point Y', describe: describeCoordinate },
        use: { label: 'Intended use', describe: describeUse },
        key_ops: { label: 'Key operations', describe: value => (Array.isArray(value) ? value.join(', ') : value) },
        alg: { label: 'Algorithm', describe: value => value },
        kid: { label: 'Key ID', describe: value => value },
        ext: { label: 'Extractable', describe: value => String(value) },
    };

    /**
     * A coordinate as hex and its length, for the point's x and y.
     * @param {string} base64Url the coordinate
     * @returns {string} the hex digits and the number of bytes, or the value as it was when it isn't base64url
     */
    function describeCoordinate(base64Url)
    {
        try
        {
            const bytes = conseal.fromBase64Url(base64Url);
            return `${toHex(bytes)} (${bytes.byteLength} bytes)`;
        }
        catch
        {
            // Not base64url: show what was pasted, and the fingerprint step says what is wrong with it
            return base64Url;
        }
    }

    /**
     * What a key's `use` says.
     * @param {string} value `sig` or `enc`
     * @returns {string} what that means
     */
    function describeUse(value)
    {
        if (value === 'sig') return 'sig: digital signatures';
        if (value === 'enc') return 'enc: encryption and key agreement';
        return value;
    }

    /**
     * Lists a key's fields.
     * @param {Record<string, unknown>} jwk the key
     */
    function renderFields(jwk)
    {
        fields.replaceChildren();
        for (const name of new Set([...FIELD_ORDER, ...Object.keys(jwk)]))
        {
            if (!(name in jwk)) continue;

            const term = document.createElement('dt');
            term.textContent = fieldDocs[name]?.label ?? name;
            const value = document.createElement('dd');
            value.textContent = fieldDocs[name] ? fieldDocs[name].describe(jwk[name]) : String(jwk[name]);
            if (['x', 'y'].includes(name)) value.classList.add('is-coordinate');

            const row = document.createElement('div');
            row.className = 'demo-field-row';
            row.append(term, value);
            fields.append(row);
        }
    }

    /**
     * A fingerprint of a key's raw public point.
     * @param {{ x: string, y: string }} jwk the key
     * @returns {Promise<string>} the SHA-256 of the uncompressed point, in hex
     */
    async function fingerprintOf(jwk)
    {
        const x = conseal.fromBase64Url(jwk.x);
        const y = conseal.fromBase64Url(jwk.y);
        const point = new Uint8Array(1 + x.byteLength + y.byteLength);
        point[0] = 0x04;
        point.set(x, 1);
        point.set(y, 1 + x.byteLength);
        return toHex(await conseal.digest(point));
    }

    /**
     * Parses a pasted key and checks that it is a public key and a point on its curve.
     * @param {string} text the pasted JSON
     * @returns {Promise<Record<string, any>>} the key
     * @throws {JwkError} when it isn't a public EC key
     */
    async function importPublicKey(text)
    {
        const jwk = JSON.parse(text);
        if (jwk.kty !== 'EC') throw new JwkError(`Expected kty "EC", got "${jwk.kty}"`);
        if (!jwk.crv) throw new JwkError('Missing "crv" field');
        if (!jwk.x || !jwk.y) throw new JwkError('Missing public point coordinates (x, y)');
        if (jwk.d) throw new JwkError('This looks like a private key. Paste a public key.');

        const usage = jwk.use === 'sig' || jwk.key_ops?.includes('verify') ? 'ECDSA' : 'ECDH';
        await conseal.importPublicKeyFromJwk(jwk, usage);
        return jwk;
    }

    /**
     * Makes a key pair and puts its public key in the box.
     * @param {HTMLElement} button the button that was pressed
     * @param {'ECDH' | 'ECDSA'} algorithm which kind of key
     */
    async function generate(button, algorithm)
    {
        clearStatus(status);
        await whileBusy(button, 'Generating…', async () =>
        {
            try
            {
                const pair = algorithm === 'ECDH' ? await conseal.generateECDHKeyPair() : await conseal.generateECDSAKeyPair();
                const jwk = await conseal.exportPublicKeyAsJwk(pair.publicKey);
                jwk.use = algorithm === 'ECDH' ? 'enc' : 'sig';
                input.value = JSON.stringify(jwk, null, 2);
            }
            catch (error)
            {
                showError(status, describe(error));
            }
        });
    }

    const generateEcdh = find(root, 'jwk-gen-ecdh');
    const generateEcdsa = find(root, 'jwk-gen-ecdsa');
    generateEcdh.addEventListener('click', () => generate(generateEcdh, 'ECDH'));
    generateEcdsa.addEventListener('click', () => generate(generateEcdsa, 'ECDSA'));

    clearButton.addEventListener('click', () =>
    {
        input.value = '';
        resultCard.hidden = true;
        clearStatus(status);
    });

    inspectButton.addEventListener('click', async () =>
    {
        clearStatus(status);
        resultCard.hidden = true;
        if (input.value.trim() === '')
        {
            showError(status, 'Paste a JWK, or generate one above.');
            return;
        }

        await whileBusy(inspectButton, 'Inspecting…', async () =>
        {
            try
            {
                const jwk = await importPublicKey(input.value.trim());
                renderFields(jwk);
                fingerprint.textContent = groupFingerprint(await fingerprintOf(jwk));
                resultCard.hidden = false;
                showOk(status, 'Valid key: the point is on the curve.');
            }
            catch (error)
            {
                showError(status, inspectMessage(error));
            }
        });
    });
}

/**
 * What to tell the reader when a key didn't inspect.
 * @param {unknown} error what was thrown
 * @returns {string} the message
 */
function inspectMessage(error)
{
    if (error instanceof SyntaxError) return 'Invalid JSON.';
    if (error instanceof Error && error.name === 'DataError') return 'Invalid key: the point is not on the specified curve.';
    return describe(error);
}
