/**
 * Interval 5-gram statistics, matching the server's `fivegramCounts` in
 * server/services/search.ts so client-side cosine values agree with server ones.
 */

export function fivegramCounts(codestring: string, n = 5): Map<string, number> {
    const symbols = Array.from(codestring.replace(/\s/g, ''));
    const counts = new Map<string, number>();
    for (let i = 0; i + n <= symbols.length; i++) {
        const gram = symbols.slice(i, i + n).join('');
        counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    return counts;
}

function norm(counts: Map<string, number>): number {
    let sum = 0;
    for (const count of counts.values()) sum += count * count;
    return Math.sqrt(sum);
}

/** Cosine similarity between two 5-gram count vectors. 0 when either string has no 5-grams. */
export function fivegramCosine(a: string, b: string): number {
    const countsA = fivegramCounts(a);
    const countsB = fivegramCounts(b);
    const denominator = norm(countsA) * norm(countsB);
    if (!denominator) return 0;
    let dot = 0;
    for (const [gram, count] of countsA) dot += count * (countsB.get(gram) ?? 0);
    return dot / denominator;
}
