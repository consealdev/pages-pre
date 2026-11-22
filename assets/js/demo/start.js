// Starts the demo: each tab gets its handlers, once the libraries they call have loaded.

import { wireAccount } from './account.js';
import { wireFiles } from './files.js';
import { wireJwk } from './jwk.js';
import { wireP2p } from './p2p.js';
import { wireRekey } from './rekey.js';
import { wireSeal } from './seal.js';
import { wireSecretKey } from './secret-key.js';
import { wireSign } from './sign.js';

const TABS = [wireSeal, wireFiles, wireAccount, wireP2p, wireSign, wireRekey, wireSecretKey, wireJwk];

/**
 * Wires every tab of the demo.
 * @param {ParentNode} root the demo
 * @param {{ conseal: typeof globalThis.conseal }} engine the loaded library
 */
export function startDemo(root, engine)
{
    for (const wireTab of TABS) wireTab(root, engine);
}
