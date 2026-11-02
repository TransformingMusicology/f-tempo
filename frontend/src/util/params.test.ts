import {describe, expect, it} from 'vitest';
import {applySettings, parseSettings, sameSearchParams} from './params';

describe('parseSettings', () => {
    it('uses defaults for missing or invalid values', () => {
        const settings = parseSettings(new URLSearchParams('rep=bogus&rank=cosine&n=7'));
        expect(settings).toEqual({representation: 'maw', ranking: 'jaccard', numResults: 10, collections: null});
    });
    it('rejects rankings that do not belong to the representation', () => {
        expect(parseSettings(new URLSearchParams('rep=5gram&rank=boolean')).ranking).toBe('cosine');
        expect(parseSettings(new URLSearchParams('rep=5gram&rank=solr')).ranking).toBe('solr');
    });
    it('filters collections to known ones and collapses a full set to null', () => {
        const known = ['A', 'B'];
        expect(parseSettings(new URLSearchParams('coll=A,Z'), known).collections).toEqual(['A']);
        expect(parseSettings(new URLSearchParams('coll=A,B'), known).collections).toBeNull();
        expect(parseSettings(new URLSearchParams('coll='), known).collections).toEqual([]);
    });
    it('round-trips through applySettings', () => {
        const original = parseSettings(new URLSearchParams('rep=5gram&rank=jaccard&n=25&coll=A'));
        const params = applySettings(new URLSearchParams('q=x&sel=y'), original);
        expect(params.get('q')).toBe('x');
        expect(parseSettings(params)).toEqual(original);
        expect(applySettings(new URLSearchParams(), parseSettings(new URLSearchParams())).toString()).toBe('');
    });
});

describe('sameSearchParams', () => {
    it('ignores selection-only parameters', () => {
        const a = new URL('http://x/?q=1&sel=a&ng=5');
        const b = new URL('http://x/?sel=b&q=1');
        const c = new URL('http://x/?q=2');
        expect(sameSearchParams(a, b)).toBe(true);
        expect(sameSearchParams(a, c)).toBe(false);
        expect(sameSearchParams(a, new URL('http://x/code?q=1'))).toBe(false);
    });
});
