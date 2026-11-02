// The bundled verovio-toolkit.js (loaded as a classic script from index.html)
// exposes a global. Only the members this app uses are declared.
interface VerovioToolkit {
    setOptions(options: Record<string, unknown>): void;
    renderData(mei: string, options: Record<string, unknown>): string;
}

interface Window {
    verovio?: {
        toolkit: new () => VerovioToolkit;
    };
}
