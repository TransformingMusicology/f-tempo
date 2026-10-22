import {Suspense, use, useCallback, useMemo, useState} from 'react';
import {Alert, Col, Row} from 'react-bootstrap';
import {useLocation, useNavigate, useNavigation} from 'react-router';
import type {SearchResult} from '../api/types';
import type {SearchLoaderData, SearchOutcome} from '../search/loaders';
import {codeUrl, pageUrl, searchUrl, type SearchOptions} from '../search/params';
import {useKeyboardShortcuts, type ShortcutHandlers} from './keyboard';
import QueryPane, {usePageNavigation, type QueryDescription} from './QueryPane';
import ResultList, {ResultListSkeleton} from './ResultList';
import ResultPane, {ResultPanePlaceholder} from './ResultPane';
import SearchOptionsPanel from './SearchOptionsPanel';

type Props = {data: SearchLoaderData};

function describeQuery(data: SearchLoaderData): QueryDescription {
    return data.kind === 'page'
        ? {kind: 'page', page: data.page}
        : {kind: 'code', codestring: data.codestring, uploadedImageUrl: data.uploadedImageUrl};
}

/** Which result is selected: the hash names a page ID; with no hash the first result is selected. */
function selectedResult(results: SearchResult[], hashId: string | null): {index: number; result: SearchResult | null} {
    if (!results.length) return {index: -1, result: null};
    const index = hashId ? results.findIndex(r => r.id === hashId) : 0;
    return index >= 0 ? {index, result: results[index]} : {index: -1, result: null};
}

/**
 * The three-column view: query page, options and results, selected result.
 * With `data.search` null the page is only being viewed and the results column offers to search.
 */
export default function PageView({data}: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    // While a navigation (and so possibly a search) is in flight, further searches are ignored
    // rather than queued: the server cannot cancel a Solr query once started.
    const inFlight = useNavigation().state !== 'idle';
    const query = useMemo(() => describeQuery(data), [data]);
    const queryId = data.kind === 'page' ? data.page.id : null;
    const [heldTitlePageId, setHeldTitlePageId] = useState<string | null>(null);

    /** URL for the same query with different options; keeps viewing or searching as it is now. */
    const buildUrl = useCallback((options: SearchOptions) => {
        if (data.kind === 'code') return codeUrl(data.codestring, options);
        return data.search ? searchUrl(data.page.id, options) : pageUrl(data.page.id, options);
    }, [data]);

    const hashId = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
    const select = useCallback((id: string | null) => {
        navigate({pathname: location.pathname, search: location.search, hash: id ? `#${encodeURIComponent(id)}` : ''}, {replace: true});
    }, [navigate, location.pathname, location.search]);

    const navigation = usePageNavigation(query, data.options);
    const searchWith = useCallback((id: string) => {
        if (!inFlight) navigate(searchUrl(id, data.options));
    }, [navigate, data.options, inFlight]);
    const searchQueryPage = useCallback(() => {
        if (inFlight) return;
        if (data.kind === 'page') navigate(searchUrl(data.page.id, data.options));
        else navigate(codeUrl(data.codestring, data.options));
    }, [navigate, data, inFlight]);

    const shared = {queryId, options: data.options, hashId, searchWith};

    return (
        <Row className="page-view g-3">
            <Col xs={12} lg={4}>
                <QueryPane query={query} navigation={navigation} />
            </Col>
            <Col xs={12} lg={4} className="results-column">
                <SearchOptionsPanel
                    options={data.options}
                    catalogues={data.catalogues}
                    buildUrl={buildUrl}
                    onSearch={searchQueryPage}
                    searchLabel={inFlight ? 'Searching…' : data.search ? 'Search again' : 'Search'}
                    disabled={inFlight}
                />
                {data.notices.map(notice => <Alert key={notice} variant="warning" className="py-1 small">{notice}</Alert>)}
                {data.search ? (
                    <Suspense fallback={<ResultListSkeleton rows={data.options.numResults} options={data.options} />}>
                        <ResultsColumn
                            {...shared}
                            search={data.search}
                            queryCodestringPromise={data.queryCodestring}
                            select={select}
                            navigation={navigation}
                            onHoldTitlePage={setHeldTitlePageId}
                        />
                    </Suspense>
                ) : (
                    <NoSearchYet navigation={navigation} onSearch={searchQueryPage} />
                )}
            </Col>
            <Col xs={12} lg={4}>
                {data.search ? (
                    <Suspense fallback={<ResultPanePlaceholder text="Searching…" />}>
                        <ResultPaneColumn {...shared} search={data.search} heldTitlePageId={heldTitlePageId} />
                    </Suspense>
                ) : (
                    <ResultPanePlaceholder text="Results appear here after a search." />
                )}
            </Col>
        </Row>
    );
}

type SharedProps = {
    search: Promise<SearchOutcome>;
    queryId: string | null;
    options: SearchOptions;
    hashId: string | null;
    searchWith: (id: string) => void;
};

/** Page viewed without a search: arrows navigate, Enter or the Search button searches. */
function NoSearchYet({navigation, onSearch}: {navigation: ReturnType<typeof usePageNavigation>; onSearch: () => void}) {
    const handlers = useMemo<ShortcutHandlers>(() => ({
        changePage: navigation.canNavigate ? navigation.changePage : undefined,
        changeBook: navigation.canNavigate ? navigation.changeBook : undefined,
        randomPage: navigation.randomPage,
        searchSelected: onSearch,
    }), [navigation, onSearch]);
    useKeyboardShortcuts(handlers);
    return <p className="text-muted small">Press <kbd>Enter</kbd> or click Search to find pages with similar music.</p>;
}

function ResultsColumn({search, queryCodestringPromise, queryId, options, hashId, select, navigation, searchWith, onHoldTitlePage}: SharedProps & {
    queryCodestringPromise: Promise<string | null>;
    select: (id: string | null) => void;
    navigation: ReturnType<typeof usePageNavigation>;
    onHoldTitlePage: (id: string | null) => void;
}) {
    const outcome = use(search);
    const queryCodestring = use(queryCodestringPromise);
    const results = useMemo(() => (outcome.ok ? outcome.response.results : []), [outcome]);
    const {index: selectedIndex, result: selected} = selectedResult(results, hashId);

    const handlers = useMemo<ShortcutHandlers>(() => ({
        moveSelection: delta => {
            if (!results.length) return;
            // Down wraps to the top; up stops at the first result.
            const next = delta > 0 ? (selectedIndex + 1) % results.length : Math.max(0, selectedIndex - 1);
            select(results[next].id);
        },
        clearSelection: () => select(null),
        changePage: navigation.canNavigate ? navigation.changePage : undefined,
        changeBook: navigation.canNavigate ? navigation.changeBook : undefined,
        randomPage: navigation.randomPage,
        searchSelected: selected ? () => searchWith(selected.id) : undefined,
    }), [results, selectedIndex, select, navigation, selected, searchWith]);
    useKeyboardShortcuts(handlers);

    if (!outcome.ok) return <SearchFailure outcome={outcome} options={options} />;
    if (!results.length) {
        return <Alert variant="secondary" className="small">No results. Try another search type or ranking, or more collections.</Alert>;
    }
    return (
        <ResultList
            response={outcome.response}
            queryId={queryId}
            queryCodestring={queryCodestring}
            selectedId={selected?.id ?? null}
            onSelect={select}
            onHoldTitlePage={id => {
                // Holding a result's title-page button also selects it, so the title page shows on the right.
                if (id) select(id);
                onHoldTitlePage(id);
            }}
        />
    );
}

function ResultPaneColumn({search, queryId, hashId, heldTitlePageId, searchWith}: SharedProps & {heldTitlePageId: string | null}) {
    const outcome = use(search);
    if (!outcome.ok) return <ResultPanePlaceholder text="" />;
    const {result} = selectedResult(outcome.response.results, hashId);
    return (
        <ResultPane
            response={outcome.response}
            result={result}
            isQuery={result !== null && result.id === queryId}
            heldFromList={result !== null && heldTitlePageId === result.id}
            onSearchWith={searchWith}
        />
    );
}

function SearchFailure({outcome, options}: {outcome: Extract<SearchOutcome, {ok: false}>; options: SearchOptions}) {
    const tooFewWords = outcome.status === 404 && options.representation === 'maw';
    return (
        <Alert variant={tooFewWords ? 'secondary' : 'danger'} className="small">
            {tooFewWords ? (
                <>This page has too few minimal absent words to search with MAWs. Try the <strong>Interval 5-grams</strong> search type.</>
            ) : (
                <><strong>The search failed.</strong> {outcome.message}</>
            )}
        </Alert>
    );
}
