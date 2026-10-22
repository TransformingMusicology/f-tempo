import {Suspense, use, useCallback, useMemo, useState} from 'react';
import {Alert, Col, Row} from 'react-bootstrap';
import {useLocation, useNavigate} from 'react-router';
import type {SearchResult} from '../api/types';
import type {SearchLoaderData, SearchOutcome} from '../search/loaders';
import {codeUrl, pageUrl, type SearchOptions} from '../search/params';
import {useKeyboardShortcuts, type ShortcutHandlers} from './keyboard';
import QueryPane, {usePageNavigation, type QueryDescription} from './QueryPane';
import ResultList, {ResultListSkeleton} from './ResultList';
import ResultPane from './ResultPane';
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

/** The three-column search view shared by page and codestring searches. */
export default function PageView({data}: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const query = useMemo(() => describeQuery(data), [data]);
    const queryId = data.kind === 'page' ? data.page.id : null;
    const [heldTitlePageId, setHeldTitlePageId] = useState<string | null>(null);

    const buildUrl = useCallback((options: SearchOptions) =>
        data.kind === 'page' ? pageUrl(data.page.id, options) : codeUrl(data.codestring, options), [data]);

    const hashId = location.hash ? decodeURIComponent(location.hash.slice(1)) : null;
    const select = useCallback((id: string | null) => {
        navigate({pathname: location.pathname, search: location.search, hash: id ? `#${encodeURIComponent(id)}` : ''}, {replace: true});
    }, [navigate, location.pathname, location.search]);

    const navigation = usePageNavigation(query, data.options);
    const searchWith = useCallback((id: string) => navigate(pageUrl(id, data.options)), [navigate, data.options]);

    const shared = {search: data.search, queryId, options: data.options, hashId};

    return (
        <Row className="page-view g-3">
            <Col xs={12} lg={4}>
                <QueryPane query={query} navigation={navigation} />
            </Col>
            <Col xs={12} lg={4} xl={3} className="results-column">
                <SearchOptionsPanel options={data.options} catalogues={data.catalogues} buildUrl={buildUrl} />
                {data.notices.map(notice => <Alert key={notice} variant="warning" className="py-1 small">{notice}</Alert>)}
                <Suspense fallback={<ResultListSkeleton rows={data.options.numResults} />}>
                    <ResultsColumn
                        {...shared}
                        queryCodestringPromise={data.queryCodestring}
                        select={select}
                        navigation={navigation}
                        searchWith={searchWith}
                        onHoldTitlePage={setHeldTitlePageId}
                    />
                </Suspense>
            </Col>
            <Col xs={12} lg={4} xl={5}>
                <Suspense fallback={null}>
                    <ResultPaneColumn {...shared} heldTitlePageId={heldTitlePageId} searchWith={searchWith} />
                </Suspense>
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
            onHoldTitlePage={onHoldTitlePage}
        />
    );
}

function ResultPaneColumn({search, queryId, hashId, heldTitlePageId, searchWith}: SharedProps & {heldTitlePageId: string | null}) {
    const outcome = use(search);
    if (!outcome.ok) return null;
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
