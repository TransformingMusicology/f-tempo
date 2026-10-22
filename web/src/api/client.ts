import type {NextIdResponse, PageMetadata, SearchResponse, SearchResult} from './types';
import type {SearchOptions} from '../search/params';

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type ApiEnvelope<T> = {status: 'ok'; data: T} | {status: 'error'; error: string};

async function readError(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if (body && typeof body.error === 'string') return body.error;
    } catch {
        // not JSON
    }
    return `${response.status} ${response.statusText}`.trim();
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {signal});
    if (!response.ok) throw new ApiError(response.status, await readError(response));
    return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        signal,
    });
    if (!response.ok) throw new ApiError(response.status, await readError(response));
    return response.json() as Promise<T>;
}

function unwrap<T>(envelope: ApiEnvelope<T>): T {
    if (envelope.status === 'ok') return envelope.data;
    throw new ApiError(500, envelope.error);
}

let cataloguesPromise: Promise<string[]> | undefined;

/** Libraries loaded on the server. Fetched once per session. */
export function getCatalogues(): Promise<string[]> {
    cataloguesPromise ??= getJson<ApiEnvelope<string[]>>('/api/catalogues').then(unwrap).catch(err => {
        cataloguesPromise = undefined;
        throw err;
    });
    return cataloguesPromise;
}

export async function getMetadata(pageId: string, signal?: AbortSignal): Promise<PageMetadata> {
    const data = await getJson<{siglum?: string; library?: string; book?: string; titlepage?: string}>(
        `/api/metadata?id=${encodeURIComponent(pageId)}`, signal);
    if (!data.siglum || !data.library || !data.book) throw new ApiError(404, `Page ${pageId} not found`);
    return {id: data.siglum, library: data.library, book: data.book, titlepage: data.titlepage};
}

export async function getRandomPage(): Promise<PageMetadata> {
    const data = await getJson<{id: string; library: string; book: string; titlepage?: string}>('/api/random_id');
    return {id: data.id, library: data.library, book: data.book, titlepage: data.titlepage};
}

export async function getNextId(library: string, book: string, page: string | null, direction: 'prev' | 'next'): Promise<NextIdResponse> {
    const params = new URLSearchParams({library, book, direction});
    if (page) params.set('page', page);
    return getJson<ApiEnvelope<NextIdResponse>>(`/api/next_id?${params}`).then(unwrap);
}

export async function getCodestring(pageId: string, signal?: AbortSignal): Promise<string> {
    return getJson<ApiEnvelope<string>>(`/api/get_codestring?id=${encodeURIComponent(pageId)}`, signal).then(unwrap);
}

export async function getMei(pageId: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`/api/get_mei?id=${encodeURIComponent(pageId)}`, {signal});
    if (!response.ok) throw new ApiError(response.status, await readError(response));
    return response.text();
}

export type QueryInput = {id: string} | {codestring: string};

type RawResult = {
    id: string; library: string; book: string; titlepage?: string; codestring: string;
    num_words: number; num_matched_words: number; jaccard: number; cosine?: number; score?: number;
};
type RawSearchResponse = {
    numQueryWords: number; numResults: number; results: RawResult[];
    ranking?: string; representation?: string;
    candidateLimit?: number; candidatesFound?: number; candidateLimited?: boolean;
};

/** Run a search. The response is normalised from the request, not from response fields. */
export async function runQuery(input: QueryInput, options: SearchOptions, signal?: AbortSignal): Promise<SearchResponse> {
    const body = {
        ...input,
        num_results: options.numResults,
        collections_to_search: options.collections,
        similarity_type: options.ranking,
        representation: options.representation,
    };
    const raw = await postJson<ApiEnvelope<RawSearchResponse>>('/api/query', body, signal).then(unwrap);
    const results: SearchResult[] = raw.results.map(r => ({
        id: r.id,
        library: r.library,
        book: r.book,
        titlepage: r.titlepage || undefined,
        codestring: r.codestring ?? '',
        numWords: r.num_words,
        numMatchedWords: r.num_matched_words,
        jaccardSimilarity: 1 - r.jaccard,
        cosine: r.cosine,
        score: r.score ?? 0,
    }));
    return {
        representation: options.representation,
        ranking: options.ranking,
        numQueryWords: raw.numQueryWords,
        results,
        candidateLimit: raw.candidateLimit,
        candidatesFound: raw.candidatesFound,
        candidateLimited: raw.candidateLimited,
    };
}

/** Upload an image for OMR. Resolves to the interval codestring the server recognised. */
export async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('user_image_file', file, file.name);
    const response = await fetch('/api/image_query', {method: 'POST', body: form});
    if (!response.ok) throw new ApiError(response.status, await readError(response));
    const data = unwrap(await response.json() as ApiEnvelope<{codestring: string}>);
    if (!data.codestring) throw new ApiError(422, 'No music was recognised in the image');
    return data.codestring;
}
