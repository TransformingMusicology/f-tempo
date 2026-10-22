import {data, type LoaderFunctionArgs} from 'react-router';
import {ApiError, getCatalogues, getCodestring, getMetadata, runQuery, type QueryInput} from '../api/client';
import type {PageMetadata, SearchResponse} from '../api/types';
import {parseSearchOptions, type SearchOptions} from './params';
import {uploadStore} from '../uploadStore';

export type SearchOutcome =
    | {ok: true; response: SearchResponse}
    | {ok: false; status: number; message: string};

type CommonLoaderData = {
    options: SearchOptions;
    notices: string[];
    catalogues: string[];
    /** The query's interval codestring, used for the cosine marker; null if unavailable. */
    queryCodestring: Promise<string | null>;
    /**
     * The search, or null when the page is only being viewed (/page/:id).
     * Never rejects: failures are returned as an outcome.
     */
    search: Promise<SearchOutcome> | null;
};

export type PageLoaderData = CommonLoaderData & {kind: 'page'; page: PageMetadata};
export type CodeLoaderData = CommonLoaderData & {kind: 'code'; codestring: string; uploadedImageUrl?: string};
export type SearchLoaderData = PageLoaderData | CodeLoaderData;

function toOutcome(error: unknown): SearchOutcome {
    if (error instanceof ApiError) return {ok: false, status: error.status, message: error.message};
    if (error instanceof DOMException && error.name === 'AbortError') return {ok: false, status: 0, message: 'Search cancelled'};
    return {ok: false, status: 0, message: error instanceof Error ? error.message : 'The search failed'};
}

function startSearch(input: QueryInput, options: SearchOptions, signal: AbortSignal): Promise<SearchOutcome> {
    return runQuery(input, options, signal)
        .then((response): SearchOutcome => ({ok: true, response}))
        .catch(toOutcome);
}

/** /page/:id shows a page without searching; /search/:id also runs the search. */
async function loadPage({params, request}: LoaderFunctionArgs, runSearch: boolean): Promise<PageLoaderData> {
    const pageId = params.id!;
    const url = new URL(request.url);
    const catalogues = await getCatalogues();
    const {options, notices} = parseSearchOptions(url.searchParams, catalogues);

    let page: PageMetadata;
    try {
        page = await getMetadata(pageId, request.signal);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            throw data({pageId, message: `No page with the ID "${pageId}" is indexed.`}, {status: 404});
        }
        throw error;
    }

    return {
        kind: 'page',
        page,
        options,
        notices,
        catalogues,
        queryCodestring: runSearch ? getCodestring(pageId, request.signal).catch(() => null) : Promise.resolve(null),
        search: runSearch ? startSearch({id: pageId}, options, request.signal) : null,
    };
}

export function pageLoader(args: LoaderFunctionArgs): Promise<PageLoaderData> {
    return loadPage(args, false);
}

export function searchLoader(args: LoaderFunctionArgs): Promise<PageLoaderData> {
    return loadPage(args, true);
}

export async function codeLoader({request}: LoaderFunctionArgs): Promise<CodeLoaderData> {
    const url = new URL(request.url);
    const codestring = (url.searchParams.get('cs') ?? '').replace(/\s/g, '');
    if (!codestring) {
        throw data({message: 'No codestring was given. Add one with ?cs=… or use the manual search page.'}, {status: 400});
    }
    const catalogues = await getCatalogues();
    const {options, notices} = parseSearchOptions(url.searchParams, catalogues);
    return {
        kind: 'code',
        codestring,
        uploadedImageUrl: uploadStore.get(codestring),
        options,
        notices,
        catalogues,
        queryCodestring: Promise.resolve(codestring),
        search: startSearch({codestring}, options, request.signal),
    };
}

/** Re-run loaders only when the path or query string changes; a hash change is a selection. */
export function revalidateUnlessHashOnly({currentUrl, nextUrl, defaultShouldRevalidate}: {
    currentUrl: URL; nextUrl: URL; defaultShouldRevalidate: boolean;
}): boolean {
    if (currentUrl.pathname === nextUrl.pathname && currentUrl.search === nextUrl.search) return false;
    return defaultShouldRevalidate;
}
