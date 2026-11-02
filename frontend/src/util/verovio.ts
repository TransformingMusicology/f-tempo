/**
 * Lazily loads the bundled Verovio toolkit (a classic script in public/) the
 * first time a score overlay needs it, so pages without overlays don't pay for
 * the download.
 */
let loading: Promise<VerovioToolkit> | null = null;
let toolkit: VerovioToolkit | null = null;

export function loadVerovio(): Promise<VerovioToolkit> {
    if (toolkit) return Promise.resolve(toolkit);
    if (!loading) {
        loading = new Promise<VerovioToolkit>((resolve, reject) => {
            const create = () => {
                if (!window.verovio) {
                    reject(new Error('Verovio did not initialise'));
                    return;
                }
                toolkit = new window.verovio.toolkit();
                toolkit.setOptions({footer: 'none', shrinkToFit: true, svgViewBox: true});
                resolve(toolkit);
            };
            if (window.verovio) {
                create();
                return;
            }
            const script = document.createElement('script');
            script.src = '/verovio-toolkit.js';
            script.onload = create;
            script.onerror = () => reject(new Error('Could not load the Verovio toolkit'));
            document.head.appendChild(script);
        });
        loading.catch(() => { loading = null; });
    }
    return loading;
}
