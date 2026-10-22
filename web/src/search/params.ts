/**
 * Search options live in the URL query string: `rep`, `rank`, `n`, `c`.
 * Defaults are omitted when serialising so URLs stay short.
 */

export const REPRESENTATIONS = ['maw', '5gram'] as const;
export type Representation = (typeof REPRESENTATIONS)[number];

export const RANKINGS = {
    maw: ['jaccard', 'boolean', 'solr'],
    '5gram': ['cosine', 'jaccard', 'solr'],
} as const;
export type Ranking = (typeof RANKINGS)[Representation][number];

export const REPRESENTATION_LABELS: Record<Representation, string> = {
    maw: 'Minimal absent words',
    '5gram': 'Interval 5-grams',
};

export const RANKING_LABELS: Record<Ranking, string> = {
    jaccard: 'Jaccard',
    boolean: 'Boolean overlap',
    solr: 'Solr BM25',
    cosine: 'Cosine',
};

export const NUM_RESULTS_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export const DEFAULT_REPRESENTATION: Representation = 'maw';
export const DEFAULT_NUM_RESULTS = 10;

export function defaultRanking(representation: Representation): Ranking {
    return RANKINGS[representation][0];
}

export function isRankingFor(representation: Representation, ranking: string): ranking is Ranking {
    return (RANKINGS[representation] as readonly string[]).includes(ranking);
}

export type SearchOptions = {
    representation: Representation;
    ranking: Ranking;
    numResults: number;
    /** Libraries to search. Empty means every library (the server treats [] as "all"). */
    collections: string[];
};

export type ParsedSearchOptions = {
    options: SearchOptions;
    /** Human-readable notes about values that were ignored or replaced. */
    notices: string[];
};

export function defaultOptions(): SearchOptions {
    return {
        representation: DEFAULT_REPRESENTATION,
        ranking: defaultRanking(DEFAULT_REPRESENTATION),
        numResults: DEFAULT_NUM_RESULTS,
        collections: [],
    };
}

/**
 * Parse options from a query string, replacing invalid values with defaults.
 * `catalogues` is the list of libraries the server has loaded; unknown collections are dropped.
 */
export function parseSearchOptions(params: URLSearchParams, catalogues: readonly string[]): ParsedSearchOptions {
    const notices: string[] = [];
    const options = defaultOptions();

    const rep = params.get('rep');
    if (rep !== null) {
        if ((REPRESENTATIONS as readonly string[]).includes(rep)) {
            options.representation = rep as Representation;
        } else {
            notices.push(`Unknown representation "${rep}"; using ${REPRESENTATION_LABELS[options.representation]}.`);
        }
    }
    options.ranking = defaultRanking(options.representation);

    const rank = params.get('rank');
    if (rank !== null) {
        if (isRankingFor(options.representation, rank)) {
            options.ranking = rank;
        } else {
            notices.push(`Ranking "${rank}" is not available for ${REPRESENTATION_LABELS[options.representation]}; using ${RANKING_LABELS[options.ranking]}.`);
        }
    }

    const n = params.get('n');
    if (n !== null) {
        const value = Number(n);
        if ((NUM_RESULTS_OPTIONS as readonly number[]).includes(value)) {
            options.numResults = value;
        } else {
            notices.push(`Result count "${n}" is not available; showing ${options.numResults}.`);
        }
    }

    const c = params.get('c');
    if (c !== null && c !== '') {
        const requested = c.split(',').filter(Boolean);
        const known = requested.filter(name => catalogues.includes(name));
        const unknown = requested.filter(name => !catalogues.includes(name));
        if (unknown.length) {
            notices.push(`Unknown collection${unknown.length > 1 ? 's' : ''} ${unknown.join(', ')} ignored.`);
        }
        // Selecting every library is the same as selecting none.
        options.collections = known.length === catalogues.length ? [] : known;
    }

    return {options, notices};
}

/** Serialise options, omitting defaults. */
export function serialiseSearchOptions(options: SearchOptions): URLSearchParams {
    const params = new URLSearchParams();
    if (options.representation !== DEFAULT_REPRESENTATION) params.set('rep', options.representation);
    if (options.ranking !== defaultRanking(options.representation)) params.set('rank', options.ranking);
    if (options.numResults !== DEFAULT_NUM_RESULTS) params.set('n', String(options.numResults));
    if (options.collections.length) params.set('c', options.collections.join(','));
    return params;
}

/** Build a page URL that carries the given options. */
export function pageUrl(pageId: string, options: SearchOptions, hash?: string): string {
    return withSearch(`/page/${encodeURIComponent(pageId)}`, serialiseSearchOptions(options), hash);
}

export function codeUrl(codestring: string, options: SearchOptions, hash?: string): string {
    const params = serialiseSearchOptions(options);
    params.set('cs', codestring);
    return withSearch('/code', params, hash);
}

function withSearch(path: string, params: URLSearchParams, hash?: string): string {
    const query = params.toString();
    return `${path}${query ? `?${query}` : ''}${hash ? `#${encodeURIComponent(hash)}` : ''}`;
}
