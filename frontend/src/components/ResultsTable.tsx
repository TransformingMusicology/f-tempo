import {Fragment, useEffect, useRef} from 'react';
import type {Ranking, SearchData} from '../api';
import {ngramCosine} from '../util/ngrams';
import {resultScore, scoreColumnLabel} from '../util/scores';
import ResultIdentity from './ResultIdentity';

interface Props {
    data: SearchData;
    ranking: Ranking;
    /** The searched page ID, so its own row can be marked. */
    queryId: string | null;
    /** Codestring of the query, for the 5-gram cosine marker in MAW mode. */
    queryCodestring: string | null;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function ResultsTable({data, ranking, queryId, queryCodestring, selectedId, onSelect}: Props) {
    const bodyRef = useRef<HTMLTableSectionElement>(null);
    const fivegram = data.representation === '5gram';

    useEffect(() => {
        if (!selectedId || !bodyRef.current) return;
        const row = bodyRef.current.querySelector<HTMLElement>(`tr[data-id="${CSS.escape(selectedId)}"]`);
        row?.scrollIntoView({block: 'nearest'});
    }, [selectedId]);

    const unit = fivegram ? '5-grams' : 'words';
    const candidateNote = data.candidateLimited && ranking !== 'solr'
        ? ` · reranked the top ${data.candidateLimit} of ${data.candidatesFound} BM25 candidates`
        : '';

    return (
        <table className="table table-sm results-table mb-2">
            <thead>
                <tr>
                    <th colSpan={3} className="fw-normal small">
                        {data.continuityApplied ? `${data.numResults} accepted · ${data.results.length - data.numResults} rejected shown` : `${data.results.length} results`} · {data.numQueryWords} {unit} in query{candidateNote}
                    </th>
                </tr>
                <tr>
                    <th scope="col">{data.continuityApplied ? 'Original rank' : '#'}</th>
                    <th scope="col">Page / score</th>
                    <th scope="col">{scoreColumnLabel(ranking)}</th>
                </tr>
            </thead>
            <tbody ref={bodyRef}>
                {data.results.map((result, index) => {
                    const score = resultScore(result, ranking, data);
                    const cosine = fivegram
                        ? result.cosine ?? null
                        : queryCodestring ? ngramCosine(queryCodestring, result.codestring, 5) : null;
                    const isQuery = result.id === queryId;
                    const selected = result.id === selectedId;
                    return (
                        <Fragment key={result.id}>
                        {result.belowThreshold && !data.results[index - 1]?.belowThreshold && <tr><th colSpan={3}>Below threshold — available for comparison</th></tr>}
                        <tr data-id={result.id} className={`${selected ? 'selected' : ''}${result.belowThreshold ? ' below-threshold' : ''}`}
                            tabIndex={0} aria-selected={selected}
                            onClick={() => onSelect(result.id)}
                            onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); onSelect(result.id); } }}>
                            <td>{result.originalRank ?? index + 1}</td>
                            <td>
                                <ResultIdentity {...result}/>
                                {result.belowThreshold && <span className="badge text-bg-secondary ms-1">Below threshold</span>}
                                {result.continuity && <div className="small">Continuity {(result.continuity.score * 100).toFixed(1)}%</div>}
                                {isQuery && <span className="badge text-bg-info ms-1">query</span>}
                            </td>
                            <td>
                                <div className="progress" title={`${scoreColumnLabel(ranking)}: ${score.text}`}>
                                    <div className="progress-bar" role="progressbar"
                                         style={{width: `${score.fraction * 100}%`}}
                                         aria-valuenow={Math.round(score.fraction * 100)} aria-valuemin={0} aria-valuemax={100}
                                         aria-label={score.text}/>
                                    <span className="score-text">{score.text}</span>
                                    {cosine !== null && (
                                        <div className="cosine-marker" style={{left: `${cosine * 100}%`}}
                                             title={`Interval 5-gram cosine similarity to the query: ${(cosine * 100).toFixed(1)}%`}/>
                                    )}
                                </div>
                            </td>
                        </tr>
                        </Fragment>
                    );
                })}
            </tbody>
        </table>
    );
}
