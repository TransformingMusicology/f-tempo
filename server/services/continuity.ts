import {continuity, intervalSymbols, MAX_CONTINUITY_CELLS} from '../../lib/continuity.js';

export const CONTINUITY_CANDIDATES = 100;
const MAX_BATCH_CELLS = 100_000_000;

/** Preserve retrieval order for ties; never treat an unscored page as a negative. */
export function rerankContinuity<T extends {codestring: string}>(query: string, results: T[], count: number, minimum = 0) {
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100) throw new RangeError('Minimum continuity must be between 0 and 100');
    const queryLength = intervalSymbols(query).length;
    const costs = results.map(r => (queryLength + 1) * (intervalSymbols(r.codestring).length + 1));
    if (costs.some(cost => cost > MAX_CONTINUITY_CELLS) || costs.reduce((a, b) => a + b, 0) > MAX_BATCH_CELLS) {
        return {
            results: results.slice(0, count), numResults: Math.min(count, results.length),
            continuityApplied: false, continuityCandidates: results.length,
            continuityNotice: 'Continuity comparison exceeded its limit; ranking and minimum continuity were not applied. The original ranking is shown.',
        };
    }
    const scored = results.map(result => ({...result, continuity: continuity(query, result.codestring)}));
    scored.sort((a, b) => b.continuity.score - a.continuity.score);
    const retained = scored.filter(r => r.continuity.score * 100 + 1e-9 >= minimum);
    return {
        results: retained.slice(0, count), numResults: Math.min(count, retained.length),
        continuityApplied: true, continuityCandidates: results.length,
        continuityFiltered: scored.length - retained.length, continuityMinimum: minimum,
    };
}
