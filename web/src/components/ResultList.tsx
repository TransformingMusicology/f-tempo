import {useEffect, useRef} from 'react';
import {Badge, Placeholder, ProgressBar, Table} from 'react-bootstrap';
import type {SearchResponse} from '../api/types';
import {cosineMarker, describeScore, scoreLabel} from '../search/score';
import {TitlePageButton} from './TitlePageHold';
import type {SearchOptions} from '../search/params';

type Props = {
    response: SearchResponse;
    queryId: string | null;
    queryCodestring: string | null;
    selectedId: string | null;
    onSelect: (id: string) => void;
    /** Called while a result's title-page button is held. */
    onHoldTitlePage: (id: string | null) => void;
};

/** Same table structure as the results, with placeholders, so the layout does not jump when results arrive. */
export function ResultListSkeleton({rows, options}: {rows: number; options: SearchOptions}) {
    return (
        <Table size="sm" className="results-table" aria-busy="true" aria-label="Searching">
            <thead>
                <tr><th colSpan={3} className="fw-normal small"><Placeholder animation="glow"><Placeholder xs={7} /></Placeholder></th></tr>
                <tr>
                    <th className="title-col" />
                    <th>Page</th>
                    <th>{scoreLabel(options)}</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({length: rows}, (_, i) => (
                    <tr key={i}>
                        <td className="title-col" />
                        <td className="result-id"><Placeholder animation="glow"><Placeholder xs={9} /></Placeholder></td>
                        <td className="score-cell">
                            <div className="score-bar"><ProgressBar now={i === 0 ? 100 : Math.max(12, 70 - i * 7)} variant="secondary" className="opacity-25" /></div>
                            <span className="score-text"><Placeholder animation="glow"><Placeholder xs={10} /></Placeholder></span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
}

export default function ResultList({response, queryId, queryCodestring, selectedId, onSelect, onHoldTitlePage}: Props) {
    const selectedRow = useRef<HTMLTableRowElement>(null);
    const {results} = response;
    const topScore = results.reduce((max, r) => Math.max(max, r.score), 0);

    useEffect(() => {
        selectedRow.current?.scrollIntoView({block: 'nearest'});
    }, [selectedId]);

    const markers = results.map(r => cosineMarker(response, r, queryCodestring));
    const anyMarker = markers.some(m => m !== undefined);
    const candidateNote = response.candidateLimited && response.ranking !== 'solr'
        ? ` Reranked the top ${response.candidateLimit} BM25 candidates of ${response.candidatesFound} found.`
        : '';

    return (
        <>
            <Table size="sm" hover className="results-table">
                <thead>
                    <tr>
                        <th colSpan={3} className="fw-normal small">
                            {results.length} result{results.length === 1 ? '' : 's'} · {response.numQueryWords} words in query.{candidateNote}
                        </th>
                    </tr>
                    <tr>
                        <th className="title-col"><span className="visually-hidden">Title page</span></th>
                        <th>Page</th>
                        <th>{scoreLabel(response)}</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, index) => {
                        const score = describeScore(response, result, topScore);
                        const isSelected = result.id === selectedId;
                        const isQuery = result.id === queryId;
                        const marker = markers[index];
                        return (
                            <tr
                                key={result.id}
                                ref={isSelected ? selectedRow : undefined}
                                className={`${isSelected ? 'table-active' : ''} ${isQuery ? 'query-row' : ''}`}
                                onClick={() => onSelect(result.id)}
                                aria-selected={isSelected}
                            >
                                <td className="title-col" onClick={e => e.stopPropagation()}>
                                    <TitlePageButton titlepage={result.titlepage} label={result.id} setHeld={held => onHoldTitlePage(held ? result.id : null)} />
                                </td>
                                <td className="result-id">
                                    <span className="text-muted">{index + 1}.</span> {result.id}
                                    {isQuery && <> <Badge bg="info" text="dark" title="This result is the query page itself">query</Badge></>}
                                </td>
                                <td className="score-cell">
                                    <div className="score-bar" title={`${score.label}: ${score.text}`}>
                                        <ProgressBar now={score.fraction * 100} aria-label={`${score.label} ${score.text}`} />
                                        {marker !== undefined && (
                                            <span
                                                className="cosine-marker"
                                                style={{left: `${marker * 100}%`}}
                                                title={`5-gram cosine similarity ${(marker * 100).toFixed(1)}%`}
                                            />
                                        )}
                                    </div>
                                    <span className="score-text">{score.text}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
            {anyMarker && <p className="text-muted small mb-1"><span className="cosine-marker-legend" /> 5-gram cosine similarity to the query</p>}
        </>
    );
}
