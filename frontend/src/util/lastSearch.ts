const KEY = 'ftempo.lastSearch';

/** Remembers the most recent search URL so it can be repeated after browsing away from it. */
export function rememberSearch(url: URL) {
    try {
        sessionStorage.setItem(KEY, url.pathname + url.search);
    } catch {
        // storage unavailable; the Repeat button simply stays hidden
    }
}

export function lastSearch(): string | null {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
}
