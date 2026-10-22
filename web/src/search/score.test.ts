import {describe, expect, it} from 'vitest';
import type {SearchResponse, SearchResult} from '../api/types';
import {fivegramCosine} from './fivegram';
import {cosineMarker, describeScore} from './score';

function result(overrides: Partial<SearchResult>): SearchResult {
    return {
        id: 'X', library: 'GB-Lbl', book: 'B', codestring: 'abcdeabcde',
        numWords: 20, numMatchedWords: 5, jaccardSimilarity: 0.25, score: 4, ...overrides,
    };
}

function response(overrides: Partial<SearchResponse>): SearchResponse {
    return {representation: 'maw', ranking: 'jaccard', numQueryWords: 10, results: [], ...overrides};
}

describe('describeScore', () => {
    it('shows MAW Jaccard as a similarity percentage', () => {
        const d = describeScore(response({}), result({jaccardSimilarity: 0.4}), 9);
        expect(d).toEqual({label: 'Jaccard similarity', fraction: 0.4, text: '40.0%'});
    });

    it('shows 5-gram Jaccard from the score field', () => {
        const d = describeScore(response({representation: '5gram', ranking: 'jaccard'}), result({score: 0.3, jaccardSimilarity: 0.99}), 1);
        expect(d.fraction).toBe(0.3);
    });

    it('shows boolean overlap as matched over query words', () => {
        const d = describeScore(response({ranking: 'boolean'}), result({numMatchedWords: 5}), 9);
        expect(d).toEqual({label: 'Query MAWs matched', fraction: 0.5, text: '5 / 10'});
    });

    it('shows BM25 relative to the top score and survives a zero top score', () => {
        expect(describeScore(response({ranking: 'solr'}), result({score: 4}), 8).fraction).toBe(0.5);
        expect(describeScore(response({ranking: 'solr'}), result({score: 0}), 0).fraction).toBe(0);
    });

    it('shows 5-gram cosine from the cosine field', () => {
        const d = describeScore(response({representation: '5gram', ranking: 'cosine'}), result({cosine: 0.75}), 1);
        expect(d).toEqual({label: 'Cosine similarity', fraction: 0.75, text: '75.0%'});
    });
});

describe('cosineMarker', () => {
    it('is hidden when cosine is the ranking', () => {
        expect(cosineMarker(response({representation: '5gram', ranking: 'cosine'}), result({cosine: 0.5}), 'abcde')).toBeUndefined();
    });
    it('uses the response cosine for other 5-gram rankings', () => {
        expect(cosineMarker(response({representation: '5gram', ranking: 'solr'}), result({cosine: 0.5}), null)).toBe(0.5);
    });
    it('computes cosine from codestrings for MAW rankings and needs the query', () => {
        expect(cosineMarker(response({}), result({codestring: 'abcde'}), 'abcde')).toBeCloseTo(1);
        expect(cosineMarker(response({}), result({codestring: 'abcde'}), null)).toBeUndefined();
    });
});

describe('fivegramCosine', () => {
    it('matches hand-computed values', () => {
        // "abcdef" has grams abcde, bcdef; "abcdeX" has abcde, bcdeX. dot=1, norms sqrt2 and sqrt2.
        expect(fivegramCosine('abcdef', 'abcdeX')).toBeCloseTo(0.5);
        // "abcdeXabcde" has 7 grams: abcde twice and five others once, so its norm is sqrt(4 + 5) = 3.
        // "abcdeY" (abcde, bcdeY) shares abcde: dot = 2, norms sqrt2 and 3.
        expect(fivegramCosine('abcdeY', 'abcdeXabcde')).toBeCloseTo(2 / (Math.sqrt(2) * 3));
        expect(fivegramCosine('abc', 'abcdef')).toBe(0);
        expect(fivegramCosine('aaaaaa', 'aaaaaa')).toBeCloseTo(1);
    });
});
