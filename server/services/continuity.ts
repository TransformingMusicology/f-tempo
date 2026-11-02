import {continuity, intervalSymbols, MAX_CONTINUITY_CELLS} from '../../lib/continuity.js';

export const CONTINUITY_CANDIDATES = 100;
const MAX_BATCH_CELLS = 100_000_000;

/** Keep search ranking; append rejected candidates inside the displayed rank range. */
export function filterContinuity<T extends {codestring: string}>(query: string, results: T[], count: number, minimum = 0) {
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100) throw new RangeError('Minimum continuity must be between 0 and 100');
    const queryLength = intervalSymbols(query).length;
    const costs = results.map(r => (queryLength + 1) * (intervalSymbols(r.codestring).length + 1));
    if (costs.some(cost => cost > MAX_CONTINUITY_CELLS) || costs.reduce((a, b) => a + b, 0) > MAX_BATCH_CELLS) {
        return {
            results: results.slice(0, count), numResults: Math.min(count, results.length),
            continuityApplied: false, continuityCandidates: results.length,
            continuityNotice: 'This search is too large for continuity filtering. The filter was not applied; the original results are shown.',
        };
    }
    const scored = results.map((result, index) => {
        const evidence = continuity(query, result.codestring);
        return {...result, continuity: evidence, originalRank: index + 1,
            belowThreshold: evidence.score * 100 + 1e-9 < minimum};
    });
    const retained = scored.filter(r => !r.belowThreshold).slice(0, count);
    const first = retained[0]?.originalRank ?? 0;
    const last = retained.at(-1)?.originalRank ?? 0;
    const omitted = scored.filter(r => r.belowThreshold && r.originalRank > first && r.originalRank < last);
    return {
        results: [...retained, ...omitted], numResults: retained.length,
        continuityApplied: true, continuityCandidates: results.length,
        continuityFiltered: scored.filter(r => r.belowThreshold).length, continuityMinimum: minimum,
    };
}
