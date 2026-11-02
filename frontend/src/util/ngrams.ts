/**
 * Interval n-gram helpers shared by the results list (cosine marker) and the
 * score overlay (shared-passage colouring). A codestring is one character per
 * interval between consecutive notes, so the n-gram starting at index i spans
 * notes i .. i + n.
 */

/** All complete n-grams of `str`, in order. Empty when the string is shorter than n. */
export function ngramArray(str: string, n: number): string[] {
    const grams: string[] = [];
    for (let i = 0; i + n <= str.length; i++) {
        grams.push(str.substring(i, i + n));
    }
    return grams;
}

/** Every start index at which `find` occurs in `source`, including overlapping occurrences. */
export function allIndexesOf(source: string, find: string): number[] {
    const indexes: number[] = [];
    if (!find.length) return indexes;
    for (let pos = source.indexOf(find); pos !== -1; pos = source.indexOf(find, pos + 1)) {
        indexes.push(pos);
    }
    return indexes;
}

/**
 * For each start index in `a`, the start indexes in `b` where the same n-gram
 * occurs. The array has one entry per character of `a`; positions with no
 * complete n-gram or no match hold an empty array.
 */
export function commonNgramPositions(a: string, b: string, n: number): number[][] {
    const grams = ngramArray(a, n);
    const cache = new Map<string, number[]>();
    const positions: number[][] = [];
    for (let i = 0; i < a.length; i++) {
        const gram = grams[i];
        if (gram === undefined) {
            positions.push([]);
            continue;
        }
        let found = cache.get(gram);
        if (!found) {
            found = allIndexesOf(b, gram);
            cache.set(gram, found);
        }
        positions.push(found);
    }
    return positions;
}

function ngramCounts(str: string, n: number): Map<string, number> {
    const counts = new Map<string, number>();
    for (const gram of ngramArray(str, n)) {
        counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    return counts;
}

/** Cosine similarity between the n-gram frequency vectors of two codestrings; 0 when either has none. */
export function ngramCosine(a: string, b: string, n: number): number {
    const ca = ngramCounts(a, n);
    const cb = ngramCounts(b, n);
    if (!ca.size || !cb.size) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const [gram, count] of ca) {
        na += count * count;
        dot += count * (cb.get(gram) ?? 0);
    }
    for (const count of cb.values()) nb += count * count;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
