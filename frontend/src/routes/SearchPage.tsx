import {useLoaderData, useSearchParams, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs} from 'react-router';
import {preserveBrowse} from '../util/browseState';
import BookBrowser from '../components/BookBrowser';
import {
    ApiError, getCodestring, getMetadata, runSearch,
    type PageMetadata, type SearchData, type SearchResult,
} from '../api';
import {DEFAULT_PAGE_ID, pageImageUrl} from '../config';
import {parseSettings, sameSearchParams, type SearchSettings} from '../util/params';
import {scoreColumnLabel} from '../util/scores';
import {rememberSearch} from '../util/lastSearch';
import CompareToolbar from '../components/CompareToolbar';
import ContinuityDetails from '../components/ContinuityDetails';
import ContinuitySummary from '../components/ContinuitySummary';
import Notice from '../components/Notice';
import PagePane from '../components/PagePane';
import ResultsTable from '../components/ResultsTable';
import ResultIdentity from '../components/ResultIdentity';
import SearchControls from '../components/SearchControls';
import {useSearchSession} from './useSearchSession';
import {scoreTarget} from '../util/scoreUrl';
import VoiceSelector from '../components/VoiceSelector';

export type SearchOutcome = {status: 'ok'; data: SearchData} | {status: 'error'; message: string};

export interface SearchLoaderData {
    mode: 'id' | 'code';
    /** Page shown in the query pane (ID mode). */
    displayedId: string | null;
    metadata: PageMetadata | null;
    metadataError: string | null;
    /** The searched page ID (ID mode) or codestring (code mode); null while only browsing. */
    query: string | null;
    /** Interval codestring of the query, for the cosine marker and overlay colouring. */
    queryCodestring: string | null;
    search: SearchOutcome | null;
    settings: SearchSettings;
}

async function performSearch(body: Parameters<typeof runSearch>[0]): Promise<SearchOutcome> {
    try {
        return {status: 'ok', data: await runSearch(body)};
    } catch (error) {
        if (error instanceof ApiError) return {status: 'error', message: error.message};
        throw error;
    }
}

function requestBody(settings: SearchSettings) {
    return {
        representation: settings.representation,
        similarity_type: settings.ranking,
        num_results: settings.numResults,
        collections_to_search: settings.collections ?? [],
        continuity: !!settings.continuity,
        continuity_minimum: settings.continuityMinimum ?? 25,
    };
}

export async function idSearchLoader({request}: LoaderFunctionArgs): Promise<SearchLoaderData> {
    const url = new URL(request.url);
    const settings = parseSettings(url.searchParams);
    const browsing = url.searchParams.get('view') === 'browse';
    const savedQuery = url.searchParams.get('q')?.trim() || null;
    const q = browsing ? null : savedQuery;
    const page = url.searchParams.get('page')?.trim() || null;
    const target = scoreTarget(q ?? page ?? savedQuery ?? DEFAULT_PAGE_ID,
        browsing && page ? null : url.searchParams.get('part'));
    const displayedId = target.id;
    const requestedId = target.part ? `${displayedId}_part${target.part}` : displayedId;

    const metadataPromise = getMetadata(requestedId)
        .then(metadata => ({metadata, metadataError: null}))
        .catch(error => ({metadata: null, metadataError: error instanceof Error ? error.message : 'Could not load page details'}));
    const searchPromise = metadataPromise.then(({metadata}) => q && metadata?.notmusic !== true
        ? (settings.collections?.length === 0
            ? Promise.resolve<SearchOutcome>({status: 'error', message: 'Select at least one collection to search.'})
            : performSearch({id: metadata?.siglum ?? requestedId, ...requestBody(settings)}))
        : Promise.resolve(null));
    const codestringPromise = metadataPromise.then(({metadata}) => q
        ? getCodestring(metadata?.siglum ?? requestedId).catch(() => null) : null);

    const [{metadata, metadataError}, search, queryCodestring] = await Promise.all([
        metadataPromise, searchPromise, codestringPromise,
    ]);
    if (q) rememberSearch(url);
    return {mode: 'id', displayedId, metadata, metadataError, query: q ? metadata?.siglum ?? requestedId : null, queryCodestring, search, settings};
}

export async function codeSearchLoader({request}: LoaderFunctionArgs): Promise<SearchLoaderData> {
    const url = new URL(request.url);
    const settings = parseSettings(url.searchParams);
    const code = url.searchParams.get('code')?.replace(/\s+/g, '') || null;
    let search: SearchOutcome | null = null;
    if (code) {
        search = settings.collections?.length === 0
            ? {status: 'error', message: 'Select at least one collection to search.'}
            : await performSearch({codestring: code, ...requestBody(settings)});
        rememberSearch(url);
    }
    return {
        mode: 'code', displayedId: null, metadata: null, metadataError: null,
        query: code, queryCodestring: code, search, settings,
    };
}

/** Changing only the selected result or n-gram length must not re-run the search. */
export function searchShouldRevalidate({currentUrl, nextUrl, defaultShouldRevalidate}: ShouldRevalidateFunctionArgs) {
    if (currentUrl.href === nextUrl.href) return defaultShouldRevalidate;
    return !sameSearchParams(currentUrl, nextUrl);
}

function resultSummary(result: SearchResult, data: SearchData): string {
    const unit = data.representation === '5gram' ? '5-grams' : 'words';
    return `${result.num_matched_words} of ${result.num_words} ${unit} in this page match the query`;
}

export default function SearchPage() {
    const data = useLoaderData() as SearchLoaderData;
    const [params, setParams] = useSearchParams();
    const bookTab = params.get('view') === 'browse' || (params.get('view') !== 'results' && !params.has('q'));
    function setBookTab(browse: boolean) {
        const next = preserveBrowse(new URLSearchParams(params), data.metadata);
        next.set('view', browse ? 'browse' : 'results');
        setParams(next);
    }
    const {
        catalogues, busy, results, searchData, ranking, selected, selectedIndex, ngramLength, showTarget,
        target, setTarget, notice, setNotice, showNotes, setShowNotes, zoom, setZoom, formRef, comparison,
        setViewParam, submitSearch, submitSearchWith, changeSettings, step, random, searchFromSelected, repeat,
        queryTitlepage, selectedScore, revalidate, draftSettings,
    } = useSearchSession(data, '/');
    const compareToolbar = searchData && results.length > 0 ? (
        <><CompareToolbar showNotes={showNotes} onShowNotes={setShowNotes} zoom={zoom} onZoom={setZoom}
                        ngramLength={ngramLength} onNgramLength={n => setViewParam('ng', String(n))}/>
            {showNotes && <ContinuityDetails key={selected?.id} result={selected} evidence={comparison.evidence} queryLength={data.queryCodestring?.replace(/\s/g, '').length ?? 0}
                cursor={comparison.graphIndex} onHover={comparison.onGraphHover}/>}</>
    ) : null;

    const modeTabs = data.mode === 'id' && <div className="btn-group mb-2" aria-label="Interface mode">
        <button className={`btn btn-sm ${bookTab ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setBookTab(true)}>Browse</button>
        <button className={`btn btn-sm ${!bookTab ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setBookTab(false)}>Search / compare</button>
    </div>;

    if (data.mode === 'id' && bookTab) {
        const library = params.get('library') ?? data.metadata?.library;
        const book = params.has('library') ? params.get('book') : data.metadata?.book;
        const pageInBook = data.metadata?.library === library && data.metadata?.book === book;
        return <>
            {modeTabs}
            <div className="main-browse">
                <section className="card" aria-label="Library books">
                    <BookBrowser metadata={data.metadata} catalogues={catalogues} panel="books"/>
                </section>
                <section className="card" aria-label="Book pages">
                    <BookBrowser metadata={data.metadata} catalogues={catalogues} panel="pages"/>
                </section>
                <section aria-label="Selected page">
                    {pageInBook ? <PagePane key={data.metadata?.siglum}
                        heading={<ResultIdentity id={data.displayedId ?? ''} {...data.metadata}/>}
                        imageUrl={data.displayedId ? pageImageUrl(data.displayedId) : null}
                        imageAlt={`Scan of page ${data.displayedId}`}
                        meiId={data.metadata?.siglum ?? data.displayedId} codestring={null}
                        matches={[]} highlightRanges={[]} onHoverNote={() => {}}
                        titlepageUrl={queryTitlepage} showNotes={false} zoom={zoom}
                        actions={<button className="btn btn-primary btn-sm" disabled={busy || data.metadata?.notmusic === true}
                            onClick={() => {if (data.displayedId) submitSearchWith(data.displayedId);}}>Search {data.metadata?.part_name || 'this page'}</button>}>
                        <VoiceSelector metadata={data.metadata}/>
                        {data.metadata?.notmusic === true && <Notice kind="warning" message="This page is identified as not music. Search is disabled."/>}
                    </PagePane> : <div className="card p-3 text-muted">Select a page to view or search it.</div>}
                </section>
            </div>
        </>;
    }

    return (
        <>
            {modeTabs}
            <div className="row g-2">
                <div className="col-lg pane-col">
                    {data.mode === 'id' ? (
                        <>
                            <PagePane key={data.displayedId}
                                      heading={<>{data.query ? 'Query' : 'Page'}: <ResultIdentity id={data.displayedId ?? ''} {...data.metadata}/></>}
                                      subheading={data.metadata
                                          ? <>Library {data.metadata.library} · book {data.metadata.book}</>
                                          : data.metadataError ?? 'This page ID is not in the index.'}
                                      actions={
                                          <div className="btn-group btn-group-sm me-2 mb-1" role="group" aria-label="Browse pages">
                                              <button type="button" className="btn btn-outline-secondary" onClick={() => step('prev', 'book')}
                                                      title="Previous book (Shift+←)">« Book</button>
                                              <button type="button" className="btn btn-outline-secondary" onClick={() => step('prev', 'page')}
                                                      title="Previous page (←)">‹ Page</button>
                                              <button type="button" className="btn btn-outline-secondary" onClick={random}
                                                      title="Random page (backslash)">Random</button>
                                              <button type="button" className="btn btn-outline-secondary" onClick={() => step('next', 'page')}
                                                      title="Next page (→)">Page ›</button>
                                              <button type="button" className="btn btn-outline-secondary" onClick={() => step('next', 'book')}
                                                      title="Next book (Shift+→)">Book »</button>
                                          </div>
                                      }
                                      imageUrl={data.displayedId ? pageImageUrl(data.displayedId) : null}
                                      imageAlt={`Scan of page ${data.displayedId}`}
                                      meiId={data.metadata?.siglum ?? data.displayedId} codestring={data.queryCodestring} titlepageUrl={queryTitlepage}
                                      matches={comparison.queryMatches} highlightRanges={comparison.queryRanges}
                                      onHoverNote={comparison.onHoverQuery} showNotes={showNotes} zoom={zoom}
                                      footer={compareToolbar}>
                                <VoiceSelector metadata={data.metadata}/>
                                <Notice message={notice} onDismiss={() => setNotice(null)}/>
                                {data.metadata?.notmusic === true && <Notice kind="warning" message="This page is identified as not music. Search is disabled."/>}
                            </PagePane>
                        </>
                    ) : (
                        <div className="card h-100">
                            <div className="card-body py-2">
                                <div className="fw-semibold">Query codestring</div>
                                {data.query ? (
                                    <>
                                        <code className="d-block text-break small">{data.query}</code>
                                        {compareToolbar && <div className="mt-2">{compareToolbar}</div>}
                                    </>
                                ) : (
                                    <div className="small text-muted">
                                        Enter an interval codestring (one character per interval between consecutive notes)
                                        and press Search.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-lg-auto results-col">
                    <div className="card">
                        <div className="card-body py-2">
                            <SearchControls mode={data.mode} settings={draftSettings} catalogues={catalogues}
                                            target={target} onTargetChange={setTarget} onSubmit={() => submitSearch()}
                                            onSettingsChange={changeSettings} onRepeat={repeat} busy={busy} formRef={formRef}
                                            showTarget={showTarget}
                                            searchDisabled={data.mode === 'id' && data.metadata?.notmusic === true && (!showTarget || target.trim() === data.displayedId)}
                                            onShowTarget={() => setViewParam('ids', '1')}/>
                            {data.search?.status === 'error' && (
                                <Notice kind="danger" message={data.search.message}
                                        action={{label: 'Retry', onClick: revalidate}}/>
                            )}
                            {searchData && <ContinuitySummary data={searchData}/>}
                            {searchData && !searchData.continuityApplied && results.length === 0 && (
                                <Notice kind="info" message="No results for this query."/>
                            )}
                            {searchData && results.length > 0 && (
                                <ResultsTable data={searchData} ranking={ranking}
                                              queryId={data.mode === 'id' ? data.query : null}
                                              queryCodestring={data.queryCodestring} selectedId={selected?.id ?? null}
                                              onSelect={id => setViewParam('sel', id)}/>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg pane-col">
                    {selected && searchData ? (
                        <PagePane key={selected.id}
                                  heading={<>{selected.belowThreshold ? 'Filtered-out result' : 'Result'} {selected.originalRank ?? selectedIndex + 1}: <ResultIdentity {...selected}/></>}
                                  subheading={<>{resultSummary(selected, searchData)}
                                      {selectedScore && <> · {scoreColumnLabel(ranking)} {selectedScore.text}</>}</>}
                                  imageUrl={pageImageUrl(selected.id)} imageAlt={`Scan of page ${selected.id}`}
                                  meiId={selected.id} codestring={selected.codestring} titlepageUrl={selected.titlepage ?? null}
                                  matches={comparison.matchMatches} highlightRanges={comparison.matchRanges}
                                  onHoverNote={comparison.onHoverMatch} showNotes={showNotes} zoom={zoom}
                                  actions={
                                      <button type="button" className="btn btn-primary btn-sm" onClick={searchFromSelected}
                                              title="Search using this result as the query (Shift+Enter)">
                                          Search from this result
                                      </button>
                                  }/>
                    ) : (
                        <div className="card h-100">
                            <div className="card-body py-2 small text-muted">
                                {searchData ? 'No result to show.' : 'The selected result will be shown here after a search.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
