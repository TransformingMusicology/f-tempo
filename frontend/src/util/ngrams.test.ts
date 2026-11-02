import {describe, expect, it} from 'vitest';
import {allIndexesOf, commonNgramPositions, ngramArray, ngramCosine} from './ngrams';

describe('ngramArray', () => {
    it('returns every complete n-gram', () => {
        expect(ngramArray('abcde', 3)).toEqual(['abc', 'bcd', 'cde']);
    });
    it('is empty for strings shorter than n', () => {
        expect(ngramArray('ab', 3)).toEqual([]);
    });
});

describe('allIndexesOf', () => {
    it('finds overlapping occurrences including the final position', () => {
        expect(allIndexesOf('aaaa', 'aa')).toEqual([0, 1, 2]);
        expect(allIndexesOf('xyzab', 'ab')).toEqual([3]);
    });
});

describe('commonNgramPositions', () => {
    it('maps each query position to match positions', () => {
        const positions = commonNgramPositions('abcd', 'xabcabc', 3);
        expect(positions).toEqual([[1, 4], [], [], []]);
    });
});

describe('ngramCosine', () => {
    it('is 1 for identical strings and 0 with nothing in common', () => {
        expect(ngramCosine('abcdef', 'abcdef', 5)).toBeCloseTo(1);
        expect(ngramCosine('abcdef', 'ghijkl', 5)).toBe(0);
        expect(ngramCosine('ab', 'abcdef', 5)).toBe(0);
    });
});
