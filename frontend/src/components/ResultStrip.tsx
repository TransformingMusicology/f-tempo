import {useEffect, useRef} from 'react';
import type {Ranking, SearchData} from '../api';
import {pageImageUrl} from '../config';
import {ngramCosine} from '../util/ngrams';
import {resultScore, scoreColumnLabel} from '../util/scores';

interface Props {
    data: SearchData;
    ranking: Ranking;
    queryId: string | null;
    queryCodestring: string | null;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

/** Ranked results as a vertical strip of page thumbnails with their scores. */
export default function ResultStrip({data, ranking, queryId, queryCodestring, selectedId, onSelect}: Props) {
    const listRef = useRef<HTMLOListElement>(null);
    const fivegram = data.representation === '5gram';

    useEffect(() => {
        if (!selectedId || !listRef.current) return;
        listRef.current.querySelector<HTMLElement>(`li[data-id="${CSS.escape(selectedId)}"]`)
            ?.scrollIntoView({block: 'nearest'});
    }, [selectedId]);

    return (
        <ol ref={listRef} className="result-strip list-unstyled mb-0" aria-label="Results">
            {data.results.map((result, index) => {
                const score = resultScore(result, ranking, data);
                const cosine = fivegram
                    ? result.cosine ?? null
                    : queryCodestring ? ngramCosine(queryCodestring, result.codestring, 5) : null;
                const selected = result.id === selectedId;
                return (
                    <li key={result.id} data-id={result.id} className={`result-card${selected ? ' selected' : ''}`}
                        tabIndex={0} aria-current={selected ? 'true' : undefined}
                        onClick={() => onSelect(result.id)}
                        onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onSelect(result.id); } }}>
                        <img className="result-thumb" src={pageImageUrl(result.id)} alt="" loading="lazy"/>
                        <div className="result-meta">
                            <div className="result-rank">
                                {index + 1}
                                {result.id === queryId && <span className="badge text-bg-info ms-1">query</span>}
                            </div>
                            <div className="result-id page-id text-truncate" title={result.id}>{result.id}</div>
                            <div className="result-lib text-muted text-truncate">{result.library} · {result.book}</div>
                            <div className="progress" title={`${scoreColumnLabel(ranking)}: ${score.text}`}>
                                <div className="progress-bar" role="progressbar" style={{width: `${score.fraction * 100}%`}}
                                     aria-valuenow={Math.round(score.fraction * 100)} aria-valuemin={0} aria-valuemax={100}
                                     aria-label={score.text}/>
                                <span className="score-text">{score.text}</span>
                                {cosine !== null && (
                                    <div className="cosine-marker" style={{left: `${cosine * 100}%`}}
                                         title={`Interval 5-gram cosine similarity to the query: ${(cosine * 100).toFixed(1)}%`}/>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
