import {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate, useNavigation, useRevalidator, useRouteLoaderData, useSearchParams} from 'react-router';
import {getRandomId, nextId} from '../api';
import {applySettings, parseNgramLength, validSettings, type SearchSettings} from '../util/params';
import {effectiveRanking, resultScore} from '../util/scores';
import {lastSearch} from '../util/lastSearch';
import {useComparison} from '../components/useComparison';
import {useShortcuts} from '../components/useShortcuts';
import type {RootData} from './Layout';
import type {SearchLoaderData} from './SearchPage';
import {setScoreTarget} from '../util/scoreUrl';
import {isBrowsing, preserveBrowse} from '../util/browseState';

/**
 * Everything a search view needs beyond its markup: the selected result, the
 * search target, navigation between pages and books, settings changes, the
 * comparison state and the keyboard shortcuts. `basePath` is the route used
 * for page browsing and ID searches ('/' or '/explore').
 */
export function useSearchSession(data: SearchLoaderData, basePath: string) {
    const {catalogues} = useRouteLoaderData('root') as RootData;
    const [searchParams] = useSearchParams();
    const [draftSettings, setDraftSettings] = useState(data.settings);
    useEffect(() => { setDraftSettings(data.settings); }, [data.settings]);
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
        const params = applySettings(preserveBrowse(new URLSearchParams(searchParams), data.metadata), settings);
        if (data.mode === 'id' && isBrowsing(searchParams)) params.delete('coll');
        params.delete('sel');
        params.set('view', 'results');
        if (pathname === '/code') params.set('code', query);
        else setScoreTarget(params, 'q', query, query === data.displayedId ? data.metadata?.part_number : null);
        if (pathname !== '/code' && showTarget) params.set('ids', '1');
        return `${pathname}?${params}`;
    }

    function submitSearch(settings = draftSettings) {
        if (busy || !validSettings(settings)) return;
        const query = data.mode === 'code' ? target.replace(/\s+/g, '')
            : showTarget ? target.trim() : data.displayedId ?? '';
        if (!query) return;
        if (data.mode === 'id' && query === data.displayedId && data.metadata?.notmusic === true) return;
        navigate(searchUrl(query, settings));
    }

    /** Search a specific page ID regardless of the target box state. */
    function submitSearchWith(pageId: string) {
        if (pageId === data.displayedId && data.metadata?.notmusic === true) return;
        if (busy || !validSettings(draftSettings)) return;
        navigate(searchUrl(pageId, draftSettings, basePath));
    }

    function changeSettings(settings: SearchSettings) {
        setDraftSettings(settings);
    }

    function browseTo(pageId: string) {
        const params = applySettings(new URLSearchParams(searchParams), data.settings);
        params.set('page', pageId);
        params.set('view', 'browse');
        for (const key of ['library', 'book', 'booksPage', 'pagesPage']) params.delete(key);
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
            if (result.page.id === data.metadata.siglum) {
                setNotice(`Already at the ${direction === 'prev' ? 'first' : 'last'} ${unit === 'page' ? 'page of this book' : 'book of this library'}.`);
                return;
            }
            if (searchParams.get('view') === 'results' || (searchParams.has('q') && searchParams.get('view') !== 'browse')) {
                const params = applySettings(new URLSearchParams(searchParams), data.settings);
                params.delete('q');
                params.delete('sel');
                setScoreTarget(params, 'page', result.page.id);
                params.set('view', 'results');
                for (const key of ['library', 'book', 'booksPage', 'pagesPage']) params.delete(key);
                navigate(`${basePath}?${params}`);
            } else {
                browseTo(result.page.id);
            }
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
        submitSearchWith(selected.id);
    }

    async function browseSelected() {
        if (!selected) return;
        const params = new URLSearchParams(searchParams);
        try {
            const request = new URLSearchParams({library: selected.library, book: selected.book, locate: selected.id});
            const response = await fetch(`/api/browse?${request}`);
            if (!response.ok) throw new Error('Could not find this result in its book.');
            const position = await response.json();
            params.set('library', selected.library);
            params.set('book', selected.book);
            params.set('page', selected.id);
            params.set('pagesPage', String(position.pagesPage));
            params.set('booksPage', String(position.booksPage));
            params.set('view', 'browse');
            params.set('sel', selected.id);
            navigate(`${basePath}?${params}`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not browse this result.');
        }
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
        draftSettings,
        catalogues, busy, results, searchData, ranking, selected, selectedIndex, ngramLength, showTarget,
        target, setTarget, notice, setNotice, showNotes, setShowNotes, zoom, setZoom, formRef, comparison,
        setViewParam, selectIndex, submitSearch, submitSearchWith, changeSettings, step, random, searchFromSelected, browseSelected, repeat,
        queryTitlepage, selectedScore, revalidate: () => revalidator.revalidate(),
    };
}
