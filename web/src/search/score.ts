import type {SearchResponse, SearchResult} from '../api/types';
import {fivegramCosine} from './fivegram';

export type ScoreDescription = {
    /** Column heading for this ranking. */
    label: string;
    /** Bar length in [0, 1]. */
    fraction: number;
    /** Text shown on the bar. */
    text: string;
};

export function scoreLabel(response: Pick<SearchResponse, 'representation' | 'ranking'>): string {
    switch (response.ranking) {
        case 'jaccard': return 'Jaccard similarity';
        case 'cosine': return 'Cosine similarity';
        case 'boolean': return 'Query MAWs matched';
        case 'solr': return 'BM25 (% of top score)';
    }
}

function percent(fraction: number): string {
    return `${(fraction * 100).toFixed(1)}%`;
}

/**
 * Explain one result's score in the terms of the ranking that produced it.
 * `topScore` is the highest `score` in the response, used for BM25.
 */
export function describeScore(response: SearchResponse, result: SearchResult, topScore: number): ScoreDescription {
    const label = scoreLabel(response);
    switch (response.ranking) {
        case 'jaccard': {
            // MAW responses carry a Jaccard distance (already inverted); 5-gram responses put the
            // similarity in `score`. Both are in [0, 1].
            const fraction = response.representation === '5gram' ? result.score : result.jaccardSimilarity;
            return {label, fraction, text: percent(fraction)};
        }
        case 'cosine':
            return {label, fraction: result.cosine ?? 0, text: percent(result.cosine ?? 0)};
        case 'boolean': {
            const fraction = response.numQueryWords ? result.numMatchedWords / response.numQueryWords : 0;
            return {label, fraction, text: `${result.numMatchedWords} / ${response.numQueryWords}`};
        }
        case 'solr': {
            const fraction = topScore > 0 ? result.score / topScore : 0;
            return {label, fraction, text: percent(fraction)};
        }
    }
}

/**
 * The 5-gram cosine similarity between the query and a result, shown as a secondary marker.
 * Returns undefined when it would duplicate the main score (5-gram cosine ranking) or when
 * the query codestring is unknown.
 */
export function cosineMarker(response: SearchResponse, result: SearchResult, queryCodestring: string | null): number | undefined {
    if (response.ranking === 'cosine') return undefined;
    if (response.representation === '5gram') return result.cosine;
    if (!queryCodestring || !result.codestring) return undefined;
    return fivegramCosine(queryCodestring, result.codestring);
}
