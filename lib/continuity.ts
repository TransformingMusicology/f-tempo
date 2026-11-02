export type Passage = {queryStart: number; matchStart: number; length: number};
export type Continuity = {
    status: 'ok' | 'too-large';
    n: number;
    score: number;
    queryCoverage: number;
    matchCoverage: number;
    coveredIntervals: number;
    passages: Passage[];
};

export const MAX_CONTINUITY_CELLS = 2_000_000;
export const intervalSymbols = (value: string) => Array.from(value.replace(/\s/g, ''));

/**
 * Best local chain of exact n-gram anchors. Overlaps add only new intervals;
 * moving through an unmatched interval in either sequence costs half a point.
 * Both positions must advance, so repeated occurrences cannot reuse evidence.
 * O(query length * match length) time and memory, with an explicit size bound.
 * Positions are zero-based interval offsets, ends exclusive.
 */
export function continuity(query: string, match: string, n = 5): Continuity {
    if (!Number.isInteger(n) || n < 3 || n > 12) throw new RangeError('N-gram length must be between 3 and 12');
    const a = intervalSymbols(query), b = intervalSymbols(match);
    const result: Continuity = {status: 'ok', n, score: 0, queryCoverage: 0, matchCoverage: 0, coveredIntervals: 0, passages: []};
    if (a.length < n || b.length < n) return result;
    const width = b.length + 1, cells = (a.length + 1) * width;
    if (cells > MAX_CONTINUITY_CELLS) return {...result, status: 'too-large'};
    const scores = new Float32Array(cells);
    const anchors = new Float32Array(cells);
    const directions = new Uint8Array(cells); // 1 up, 2 left, 3 anchor
    const overlap = new Uint8Array(cells);
    const runs = new Uint32Array(width);
    let best = 0, bestIndex = 0;
    for (let i = 1; i <= a.length; i++) {
        let previousRun = 0;
        for (let j = 1; j <= b.length; j++) {
            const oldRun = runs[j];
            runs[j] = a[i - 1] === b[j - 1] ? previousRun + 1 : 0;
            previousRun = oldRun;
            const k = i * width + j;
            const up = scores[k - width] - 0.5, left = scores[k - 1] - 0.5;
            if (up > 0) { scores[k] = up; directions[k] = 1; }
            if (left > scores[k]) { scores[k] = left; directions[k] = 2; }
            if (runs[j] >= n) {
                const seed = scores[k - n * (width + 1)] + n;
                const extend = anchors[k - width - 1] > 0 ? anchors[k - width - 1] + 1 : 0;
                anchors[k] = Math.max(seed, extend);
                overlap[k] = extend >= seed ? 1 : 0;
                if (anchors[k] >= scores[k]) { scores[k] = anchors[k]; directions[k] = 3; }
                if (anchors[k] > best) { best = anchors[k]; bestIndex = k; }
            }
        }
    }
    let k = bestIndex, atAnchor = true;
    const reversed: Passage[] = [];
    while (k > 0) {
        if (atAnchor || directions[k] === 3) {
            const i = Math.floor(k / width), j = k % width;
            reversed.push({queryStart: i - n, matchStart: j - n, length: n});
            atAnchor = overlap[k] === 1;
            k -= (atAnchor ? 1 : n) * (width + 1);
        } else if (directions[k] === 1) k -= width;
        else if (directions[k] === 2) k--;
        else break;
    }
    for (const p of reversed.reverse()) {
        const last = result.passages.at(-1);
        if (last && p.queryStart <= last.queryStart + last.length &&
            p.matchStart - p.queryStart === last.matchStart - last.queryStart) {
            last.length = Math.max(last.length, p.queryStart + p.length - last.queryStart);
        } else result.passages.push({...p});
    }
    result.coveredIntervals = result.passages.reduce((sum, p) => sum + p.length, 0);
    result.queryCoverage = result.coveredIntervals / a.length;
    result.matchCoverage = result.coveredIntervals / b.length;
    result.score = best / Math.min(a.length, b.length);
    return result;
}
