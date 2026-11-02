import type {PageMetadata} from '../api';

export function listPage(value: string | null) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : 1;
}

/** Make implicit book/page context explicit before leaving the browse view. */
export function preserveBrowse(params: URLSearchParams, metadata: PageMetadata | null) {
    // Older browse links use page=<score>&part=N; keep that voice independently
    // of the part selected by a subsequent search.
    const page = params.get('page');
    if (!params.has('q') && page?.startsWith('cpdl_') && !/_part\d+$/.test(page) && params.get('part')) {
        params.set('page', `${page}_part${params.get('part')}`);
    }
    if (!params.has('library') && metadata) {
        params.set('library', metadata.library);
        params.set('book', metadata.book);
    }
    if (!params.has('page') && metadata) params.set('page', metadata.siglum);
    return params;
}
