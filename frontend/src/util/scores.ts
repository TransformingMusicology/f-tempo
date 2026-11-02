import type {Ranking, SearchData, SearchResult} from '../api';

export interface ScoreDisplay {
    /** 0..1, drives the bar width. */
    fraction: number;
    /** Text shown in the bar. */
    text: string;
}

export function scoreColumnLabel(ranking: Ranking): string {
    switch (ranking) {
        case 'jaccard': return 'Jaccard similarity';
        case 'cosine': return 'Cosine similarity';
        case 'boolean': return 'Query words matched';
        case 'solr': return 'BM25 (% of top score)';
    }
}

export function effectiveRanking(data: SearchData, fallback: Ranking): Ranking {
    return data.ranking ?? fallback;
}

function percent(fraction: number): string {
    return `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(1)}%`;
}

export function resultScore(result: SearchResult, ranking: Ranking, data: SearchData): ScoreDisplay {
    switch (ranking) {
        case 'jaccard': {
            const fraction = 1 - result.jaccard;
            return {fraction, text: percent(fraction)};
        }
        case 'cosine': {
            const fraction = result.cosine ?? 0;
            return {fraction, text: percent(fraction)};
        }
        case 'boolean': {
            const fraction = data.numQueryWords ? result.num_matched_words / data.numQueryWords : 0;
            return {fraction, text: `${result.num_matched_words} of ${data.numQueryWords}`};
        }
        case 'solr': {
            const top = data.results[0]?.score ?? 0;
            const fraction = top ? (result.score ?? 0) / top : 0;
            return {fraction, text: percent(fraction)};
        }
    }
}
