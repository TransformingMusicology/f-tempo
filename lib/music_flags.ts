/** Explicit hasmusic decisions take precedence over legacy flags. */
export function notMusicFlag(page: {hasmusic?: boolean; notmusic?: boolean}): boolean | undefined {
    if (typeof page.hasmusic === 'boolean') return !page.hasmusic;
    return typeof page.notmusic === 'boolean' ? page.notmusic : undefined;
}

/** Reuse cached features while applying the current index classification. */
export function refreshMusicFlag<T extends {notmusic?: boolean}>(doc: T, input: {notmusic?: boolean}): T {
    if (typeof input.notmusic === 'boolean') doc.notmusic = input.notmusic;
    return doc;
}
