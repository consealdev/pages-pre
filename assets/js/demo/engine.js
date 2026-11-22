// Loads Conseal's browser build: a classic script that puts one global, `conseal`, on the page. It is committed beside
// this folder, built from conseal v0.6.0.

const ENGINE_FILE = '../conseal.js';

/** The engine's script didn't load. */
export class EngineLoadError extends Error
{
    /**
     * @param {string} url the script that failed
     */
    constructor(url)
    {
        super(`${url} did not load`);
        this.name = 'EngineLoadError';
    }
}

/**
 * Adds a script to the page and waits for it to run.
 * @param {string} url the script's address
 * @returns {Promise<void>} done when it has run
 * @throws {EngineLoadError} when it can't be fetched
 */
function loadScript(url)
{
    return new Promise((resolve, reject) =>
    {
        const script = document.createElement('script');
        script.src = url;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new EngineLoadError(url)));
        document.head.append(script);
    });
}

/**
 * Loads the engine.
 * @returns {Promise<{ conseal: typeof globalThis.conseal }>} the library
 */
export async function loadEngine()
{
    await loadScript(new URL(ENGINE_FILE, import.meta.url).href);
    return { conseal: globalThis.conseal };
}
