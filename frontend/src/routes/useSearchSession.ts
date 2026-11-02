import {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate, useNavigation, useRevalidator, useRouteLoaderData, useSearchParams} from 'react-router';
import {getRandomId, nextId} from '../api';
import {applySettings, parseNgramLength, type SearchSettings} from '../util/params';
import {effectiveRanking, resultScore} from '../util/scores';
import {lastSearch} from '../util/lastSearch';
import {useComparison} from '../components/useComparison';
import {useShortcuts} from '../components/useShortcuts';
import type {RootData} from './Layout';
import type {SearchLoaderData} from './SearchPage';

/**
 * Everything a search view needs beyond its markup: the selected result, the
 * search target, navigation between pages and books, settings changes, the
 * comparison state and the keyboard shortcuts. `basePath` is the route used
 * for page browsing and ID searches ('/' or '/explore').
 */
export function useSearchSession(data: SearchLoaderData, basePath: string) {
    const {catalogues} = useRouteLoaderData('root') as RootData;
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const location = useLocation();
    const busy = navigation.state === 'loading' || revalidator.state === 'loading';

    const results = data.search?.status === 'ok' ? data.search.data.results : [];
    const searchData = data.search?.status === 'ok' ? data.search.data : null;
    const ranking = searchData ? effectiveRanking(searchData, data.settings.ranking) : data.settings.ranking;

    const selParam = searchParams.get('sel');
    const selected = results.find(r => r.id === selParam) ?? results[0] ?? null;
    const selectedIndex = selected ? results.indexOf(selected) : -1;
    const ngramLength = parseNgramLength(searchParams.get('ng'));
    const showTarget = searchParams.get('ids') === '1';

    const [target, setTarget] = useState(data.mode === 'id' ? data.displayedId ?? '' : data.query ?? '');
    useEffect(() => {
        setTarget(data.mode === 'id' ? data.displayedId ?? '' : data.query ?? '');
    }, [data.mode, data.displayedId, data.query]);

    const [notice, setNotice] = useState<string | null>(null);
    useEffect(() => { setNotice(null); }, [location.key]);

    const [showNotes, setShowNotes] = useState(false);
    const [zoom, setZoom] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const comparison = useComparison(data.queryCodestring, selected?.codestring ?? null, ngramLength);

    function setViewParam(key: 'sel' | 'ng' | 'ids', value: string) {
        const next = new URLSearchParams(searchParams);
        next.set(key, value);
        navigate(`${location.pathname}?${next}`, {replace: true});
    }

    function selectIndex(index: number) {
        const result = results[index];
        if (result) setViewParam('sel', result.id);
    }

    function searchUrl(query: string, settings: SearchSettings, pathname = location.pathname): string {
        const params = applySettings(new URLSearchParams(), settings);
        params.set(pathname === '/code' ? 'code' : 'q', query);
        if (pathname !== '/code' && showTarget) params.set('ids', '1');
        return `${pathname}?${params}`;
    }

    function submitSearch(settings = data.settings) {
        const query = data.mode === 'code' ? target.replace(/\s+/g, '')
            : showTarget ? target.trim() : data.displayedId ?? '';
        if (!query) return;
        navigate(searchUrl(query, settings));
    }

    /** Search a specific page ID regardless of the target box state. */
    function submitSearchWith(pageId: string) {
        navigate(searchUrl(pageId, data.settings, basePath));
    }

    function changeSettings(settings: SearchSettings) {
        if (data.query) {
            navigate(searchUrl(data.query, settings));
        } else {
            setSearchParams(prev => applySettings(prev, settings), {replace: true});
        }
    }

    function browseTo(pageId: string) {
        const params = applySettings(new URLSearchParams(), data.settings);
        params.set('page', pageId);
        if (showTarget) params.set('ids', '1');
        navigate(`${basePath}?${params}`);
    }

    async function step(direction: 'prev' | 'next', unit: 'page' | 'book') {
        if (data.mode !== 'id' || !data.displayedId) return;
        if (!data.metadata) {
            setNotice('This page is not in the index, so there is nothing to step through.');
            return;
        }
        try {
            const result = await nextId(data.metadata.library, data.metadata.book,
                unit === 'page' ? data.metadata.siglum : null, direction);
            if (result.page.id === data.displayedId) {
                setNotice(`Already at the ${direction === 'prev' ? 'first' : 'last'} ${unit === 'page' ? 'page of this book' : 'book of this library'}.`);
                return;
            }
            browseTo(result.page.id);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not find the next page');
        }
    }

    async function random() {
        try {
            const result = await getRandomId();
            browseTo(result.id);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not pick a random page');
        }
    }

    function searchFromSelected() {
        if (!selected) return;
        navigate(searchUrl(selected.id, data.settings, basePath));
    }

    const previous = lastSearch();
    const repeat = previous ? () => navigate(previous) : null;

    useShortcuts({
        up: () => selectIndex(Math.max(0, selectedIndex - 1)),
        down: () => selectIndex(selectedIndex + 1 < results.length ? selectedIndex + 1 : 0),
        left: () => step('prev', 'page'),
        right: () => step('next', 'page'),
        shiftLeft: () => step('prev', 'book'),
        shiftRight: () => step('next', 'book'),
        random,
        enter: () => { if (formRef.current) formRef.current.requestSubmit(); else submitSearch(); },
        shiftEnter: searchFromSelected,
    });

    const queryTitlepage = data.metadata?.titlepage
        ?? results.find(r => r.id === data.displayedId)?.titlepage ?? null;
    const selectedScore = selected && searchData ? resultScore(selected, ranking, searchData) : null;

    return {
        catalogues, busy, results, searchData, ranking, selected, selectedIndex, ngramLength, showTarget,
        target, setTarget, notice, setNotice, showNotes, setShowNotes, zoom, setZoom, formRef, comparison,
        setViewParam, selectIndex, submitSearch, submitSearchWith, changeSettings, step, random, searchFromSelected, repeat,
        queryTitlepage, selectedScore, revalidate: () => revalidator.revalidate(),
    };
}
