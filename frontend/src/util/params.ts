import type {Ranking, Representation} from '../api';

export const RESULT_COUNTS = [5, 10, 15, 20, 25, 30] as const;
export const DEFAULT_NGRAM_LENGTH = 5;
export const NGRAM_LENGTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const RANKINGS: Record<Representation, {value: Ranking; label: string}[]> = {
    maw: [
        {value: 'jaccard', label: 'Jaccard'},
        {value: 'boolean', label: 'Boolean overlap'},
        {value: 'solr', label: 'Solr BM25'},
    ],
    '5gram': [
        {value: 'cosine', label: 'Cosine'},
        {value: 'jaccard', label: 'Jaccard'},
        {value: 'solr', label: 'Solr BM25'},
    ],
};

export const REPRESENTATIONS: {value: Representation; label: string}[] = [
    {value: 'maw', label: 'Minimum Absent Words'},
    {value: '5gram', label: 'Interval 5-grams'},
];

export interface SearchSettings {
    representation: Representation;
    ranking: Ranking;
    numResults: number;
    /** null means every collection. */
    collections: string[] | null;
}

export const DEFAULT_SETTINGS: SearchSettings = {
    representation: 'maw',
    ranking: 'jaccard',
    numResults: 10,
    collections: null,
};

export function isRepresentation(value: string | null): value is Representation {
    return value === 'maw' || value === '5gram';
}

export function rankingFor(representation: Representation, ranking: string | null): Ranking {
    const options = RANKINGS[representation];
    const found = options.find(option => option.value === ranking);
    return found ? found.value : options[0]!.value;
}

/** Read search settings from URL parameters, replacing invalid values with defaults. */
export function parseSettings(params: URLSearchParams, knownCollections?: string[]): SearchSettings {
    const rep = params.get('rep');
    const representation = isRepresentation(rep) ? rep : DEFAULT_SETTINGS.representation;
    const ranking = rankingFor(representation, params.get('rank'));
    const n = Number(params.get('n'));
    const numResults = (RESULT_COUNTS as readonly number[]).includes(n) ? n : DEFAULT_SETTINGS.numResults;
    const coll = params.get('coll');
    let collections: string[] | null = null;
    if (coll !== null) {
        const requested = coll.split(',').map(s => s.trim()).filter(Boolean);
        collections = knownCollections ? requested.filter(c => knownCollections.includes(c)) : requested;
        if (knownCollections && collections.length === knownCollections.length) collections = null;
    }
    return {representation, ranking, numResults, collections};
}

/** Write settings into URL parameters, omitting values that equal the defaults. */
export function applySettings(params: URLSearchParams, settings: SearchSettings): URLSearchParams {
    const next = new URLSearchParams(params);
    for (const key of ['rep', 'rank', 'n', 'coll']) next.delete(key);
    if (settings.representation !== DEFAULT_SETTINGS.representation) next.set('rep', settings.representation);
    if (settings.ranking !== rankingFor(settings.representation, null)) next.set('rank', settings.ranking);
    if (settings.numResults !== DEFAULT_SETTINGS.numResults) next.set('n', String(settings.numResults));
    if (settings.collections !== null) next.set('coll', settings.collections.join(','));
    return next;
}

export function parseNgramLength(value: string | null): number {
    const n = Number(value);
    return (NGRAM_LENGTHS as readonly number[]).includes(n) ? n : DEFAULT_NGRAM_LENGTH;
}

/** Parameters that only change which result is highlighted; loaders don't need to re-run for them. */
export const VIEW_ONLY_PARAMS = ['sel', 'ng', 'ids'];

export function sameSearchParams(a: URL, b: URL): boolean {
    if (a.pathname !== b.pathname) return false;
    const strip = (url: URL) => {
        const params = new URLSearchParams(url.searchParams);
        for (const key of VIEW_ONLY_PARAMS) params.delete(key);
        params.sort();
        return params.toString();
    };
    return strip(a) === strip(b);
}
