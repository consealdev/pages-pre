// The demo window on the home page: its tabs, and the demo's scripts, which are loaded when the window is near the
// screen, not with the page. The tabs and the panels are in the page's HTML, so what the demo says is there without
// script. Plain JS, served as it is: the home page has no build step.
//
// What each tab does is in demo/: one file for each, started by demo/start.js once demo/engine.js has loaded Conseal.

// How far from the screen the window is when its scripts start loading, so they are there by the time it is reached
const LOAD_MARGIN = '400px 0px';

// How each key moves the selection between tabs
const TAB_KEYS = {
    ArrowRight: (index, count) => (index + 1) % count,
    ArrowLeft: (index, count) => (index + count - 1) % count,
    Home: () => 0,
    End: (_index, count) => count - 1,
};

/**
 * Makes the tab buttons switch the panels, as a tab list does: the selected tab is the one in the tab order, and the
 * arrow keys, Home and End move between the tabs.
 * @param {HTMLElement} root the demo
 */
function wireTabs(root)
{
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => root.querySelector(`#${tab.getAttribute('aria-controls')}`));
    const filename = root.querySelector('.demo-filename');

    const select = (index, focus = false) =>
    {
        tabs.forEach((tab, position) =>
        {
            const selected = position === index;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panels[position].hidden = !selected;
        });
        filename.textContent = tabs[index].dataset.file;
        if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, index) =>
    {
        tab.addEventListener('click', () => select(index));
        tab.addEventListener('keydown', event =>
        {
            const next = TAB_KEYS[event.key]?.(index, tabs.length);
            if (next === undefined) return;

            event.preventDefault();
            select(next, true);
        });
    });
}

/**
 * Says why the demo isn't running, in the window, and turns the controls off.
 * @param {HTMLElement} root the demo
 * @param {string} message what to tell the reader
 */
function showProblem(root, message)
{
    const notice = root.querySelector('[data-demo-notice]');
    notice.textContent = message;
    notice.hidden = false;
    for (const control of root.querySelectorAll('.demo-panel :is(button, input, textarea)')) control.disabled = true;
}

/**
 * Loads Conseal and wires the tabs.
 * @param {HTMLElement} root the demo
 */
async function start(root)
{
    // SubtleCrypto is there on https and on localhost, and nowhere else: on a plain http address the browser leaves it out
    if (!globalThis.isSecureContext || !globalThis.crypto?.subtle)
    {
        showProblem(root, 'The demo needs a secure page, https or localhost: this browser keeps its crypto functions from a page on this address.');
        return;
    }

    try
    {
        const [{ loadEngine }, { startDemo }] = await Promise.all([import('./demo/engine.js'), import('./demo/start.js')]);
        startDemo(root, await loadEngine());
        root.dataset.ready = '';
    }
    catch (error)
    {
        showProblem(root, `The demo did not load (${error instanceof Error ? error.message : String(error)}). Reload the page to try again.`);
    }
}

const demo = document.querySelector('[data-demo]');
if (demo)
{
    wireTabs(demo);

    const observer = new IntersectionObserver(entries =>
    {
        if (!entries.some(entry => entry.isIntersecting)) return;

        observer.disconnect();
        start(demo);
    }, { rootMargin: LOAD_MARGIN });
    observer.observe(demo);
}
