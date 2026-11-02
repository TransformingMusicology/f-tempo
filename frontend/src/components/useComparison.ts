import {useCallback, useEffect, useMemo, useState} from 'react';
import {commonNgramPositions} from '../util/ngrams';
import type {NoteRange} from './ScoreOverlay';
import type {SearchResult} from '../api';
import {continuityHover} from '../util/continuityHover';

type Side = 'query' | 'match';

/**
 * Shared-passage state for the two panes: which notes to colour on each side
 * and, while a note is hovered, which passages to outline on both sides.
 */
export function useComparison(queryCodestring: string | null, matchCodestring: string | null, ngramLength: number, evidence?: SearchResult['continuity']) {
    const [hover, setHover] = useState<{side: Side; index: number} | null>(null);
    const [graphIndex, setGraphIndex] = useState<number | null>(null);

    const comparable = queryCodestring !== null && matchCodestring !== null;
    const queryMatches = useMemo(
        () => comparable ? commonNgramPositions(queryCodestring, matchCodestring, ngramLength) : null,
        [comparable, queryCodestring, matchCodestring, ngramLength]);
    const matchMatches = useMemo(
        () => comparable ? commonNgramPositions(matchCodestring, queryCodestring, ngramLength) : null,
        [comparable, queryCodestring, matchCodestring, ngramLength]);

    useEffect(() => { setHover(null); }, [queryCodestring, matchCodestring, ngramLength]);
    useEffect(() => { setGraphIndex(null); }, [queryCodestring, matchCodestring, evidence]);

    const ranges = useMemo((): {query: NoteRange[]; match: NoteRange[]} => {
        const empty = {query: [], match: []};
        if (graphIndex !== null) return continuityHover(evidence, graphIndex);
        if (!hover) return {
            query: evidence?.passages.map(p => [p.queryStart, p.queryStart + p.length] as NoteRange) ?? [],
            match: evidence?.passages.map(p => [p.matchStart, p.matchStart + p.length] as NoteRange) ?? [],
        };
        const own = hover.side === 'query' ? queryMatches : matchMatches;
        const found = own?.[hover.index];
        if (!found?.length) return empty;
        const here: NoteRange[] = [[hover.index, hover.index + ngramLength]];
        const there: NoteRange[] = found.map(p => [p, p + ngramLength]);
        return hover.side === 'query' ? {query: here, match: there} : {query: there, match: here};
    }, [hover, queryMatches, matchMatches, ngramLength, evidence, graphIndex]);

    const hoverOn = useCallback((side: Side) => (index: number | null) => {
        setHover(prev => {
            if (index === null) return prev === null ? prev : null;
            if (prev && prev.side === side && prev.index === index) return prev;
            return {side, index};
        });
    }, []);

    return {
        graphIndex,
        onGraphHover: setGraphIndex,
        queryMatches,
        matchMatches,
        queryRanges: ranges.query,
        matchRanges: ranges.match,
        onHoverQuery: useMemo(() => hoverOn('query'), [hoverOn]),
        onHoverMatch: useMemo(() => hoverOn('match'), [hoverOn]),
    };
}
