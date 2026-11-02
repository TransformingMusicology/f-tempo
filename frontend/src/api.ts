/**
 * Typed client for the Express API. Every request goes to a relative /api
 * path; the Vite dev server proxies these and Express serves them in production.
 */

export type Representation = 'maw' | '5gram';
export type Ranking = 'jaccard' | 'boolean' | 'solr' | 'cosine';

export interface SearchResult {
    continuity?: {status: 'ok' | 'too-large'; n: number; score: number; coveredIntervals: number;
        passages: {queryStart: number; matchStart: number; length: number}[]};
    originalRank?: number;
    belowThreshold?: boolean;
    id: string;
    library: string;
    book: string;
    codestring: string;
    num_matched_words: number;
    num_words: number;
    /** Jaccard *distance* (1 - similarity) for both representations. */
    jaccard: number;
    /** Raw Solr score (MAW) or the ranking score (5-gram). */
    score?: number;
    /** 5-gram cosine similarity, present for 5-gram searches only. */
    cosine?: number;
    titlepage?: string;
}

export interface SearchData {
    continuityApplied?: boolean;
    continuityCandidates?: number;
    continuityFiltered?: number;
    continuityMinimum?: number;
    continuityNotice?: string;
    numQueryWords: number;
    numResults: number;
    results: SearchResult[];
    ranking?: Ranking;
    representation?: Representation;
    candidateLimit?: number;
    candidatesFound?: number;
    candidateLimited?: boolean;
    /** Added by /api/image_query so the uploaded query can be compared with results. */
    query_codestring?: string;
}

export interface PageMetadata {
    notmusic?: boolean;
    siglum: string;
    library: string;
    book: string;
    titlepage?: string;
}

export interface NextIdData {
    library: string;
    book_id: string;
    page: {id: string; [key: string]: unknown};
}

export interface SearchRequest {
    continuity?: boolean;
    continuity_minimum?: number;
    id?: string;
    codestring?: string;
    representation: Representation;
    similarity_type: Ranking;
    num_results: number;
    collections_to_search: string[];
}

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

type ApiEnvelope<T> = {status: 'ok'; data: T} | {status: 'error'; error: string};

async function request(path: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(path, init);
    } catch {
        throw new ApiError(0, 'Could not reach the search server');
    }
    return response;
}

async function errorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if (body && typeof body.error === 'string') return body.error;
    } catch {
        // fall through to a generic message
    }
    return `Request failed (${response.status})`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await request(path, init);
    if (!response.ok) {
        throw new ApiError(response.status, await errorMessage(response));
    }
    return response.json() as Promise<T>;
}

function unwrap<T>(envelope: ApiEnvelope<T>): T {
    if (envelope.status === 'ok') return envelope.data;
    throw new ApiError(500, envelope.error);
}

export async function getCatalogues(): Promise<string[]> {
    return unwrap(await requestJson<ApiEnvelope<string[]>>('/api/catalogues'));
}

/** Returns null when the page ID is not in the index. */
export async function getMetadata(id: string): Promise<PageMetadata | null> {
    const response = await request(`/api/metadata?id=${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
    const body = await response.json();
    return body && typeof body.siglum === 'string' ? body as PageMetadata : null;
}

export async function getRandomId(): Promise<{id: string; book: string; library: string}> {
    return requestJson('/api/random_id');
}

export async function nextId(library: string, book: string, page: string | null,
                             direction: 'prev' | 'next'): Promise<NextIdData> {
    const params = new URLSearchParams({library, book, direction});
    if (page) params.set('page', page);
    return unwrap(await requestJson<ApiEnvelope<NextIdData>>(`/api/next_id?${params}`));
}

/** Returns null when no codestring is indexed for the page. */
export async function getCodestring(id: string): Promise<string | null> {
    const response = await request(`/api/get_codestring?id=${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
    return unwrap(await response.json() as ApiEnvelope<string>);
}

/** Returns null when no MEI file is available for the page. */
export async function getMei(id: string): Promise<string | null> {
    const response = await request(`/api/get_mei?id=${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
    const text = await response.text();
    // Older servers answer 200 with a plain-text error when the file is unreadable.
    if (!text.trimStart().startsWith('<')) return null;
    return text;
}

export async function runSearch(body: SearchRequest): Promise<SearchData> {
    return unwrap(await requestJson<ApiEnvelope<SearchData>>('/api/query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    }));
}

export async function runImageQuery(formData: FormData): Promise<SearchData> {
    const data = unwrap(await requestJson<ApiEnvelope<SearchData | undefined>>('/api/image_query', {
        method: 'POST',
        body: formData,
    }));
    if (!data) throw new ApiError(500, 'Recognition of the uploaded image failed');
    return data;
}
