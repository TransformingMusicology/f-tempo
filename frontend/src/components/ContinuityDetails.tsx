import type {SearchResult} from '../api';

export default function ContinuityDetails({result, queryLength, cursor, onHover}: {
    result: SearchResult | null; queryLength: number; cursor: number | null; onHover: (index: number | null) => void;
}) {
    const evidence = result?.continuity;
    if (!evidence || !result) return null;
    const matchLength = result.codestring.replace(/\s/g, '').length;
    return <div className="small mt-2">
        <p className="mb-1">Continuity {(evidence.score * 100).toFixed(1)}%
            {result.belowThreshold ? ' · below the search minimum' : ''} · original rank {result.originalRank}.</p>
        <p className="mb-1">Turn on comparison to see the matching notes on the scans. Orange outlines show the passages used by the filter; hover a pink note to compare its matches.</p>
        <details onToggle={event => { if (!event.currentTarget.open) onHover(null); }}>
            <summary>Continuity graph and scoring</summary>
            <svg viewBox="0 0 440 230" role="img" aria-label="Positions of the passages used by the continuity filter" style={{width: '100%', maxWidth: 440}}
                 onMouseLeave={() => onHover(null)}
                 onMouseMove={event => {
                     const matrix = event.currentTarget.getScreenCTM();
                     if (!matrix || queryLength < 1) return;
                     const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
                     onHover(point.x < 35 || point.x > 425 ? null : Math.min(queryLength - 1, Math.floor((point.x - 35) / 390 * queryLength)));
                 }}>
                <path d="M35 10V200H430" fill="none" stroke="currentColor"/>
                {evidence.passages.map((p, i) => <line key={i}
                    x1={35 + 390 * p.queryStart / Math.max(1, queryLength)}
                    x2={35 + 390 * (p.queryStart + p.length) / Math.max(1, queryLength)}
                    y1={200 - 185 * p.matchStart / Math.max(1, matchLength)}
                    y2={200 - 185 * (p.matchStart + p.length) / Math.max(1, matchLength)}
                    stroke="darkorange" strokeWidth={3}/>)}
                <text x={170} y={225} fontSize={12}>Position in query</text>
                {cursor !== null && <line x1={35 + 390 * cursor / Math.max(1, queryLength)} x2={35 + 390 * cursor / Math.max(1, queryLength)} y1={10} y2={200} stroke="deeppink" strokeWidth={1.5}/>}
                <text transform="translate(12 160) rotate(-90)" fontSize={12}>Position in result</text>
            </svg>
            <p>Move across the graph to highlight the corresponding notes on both scans. Gaps have no matching passage.</p>
            <p>The filter uses 5-interval matches in the same order on both pages, subtracts a penalty for gaps, and compares the total with the shorter page. Changing the comparison n-gram length only changes the pink highlights; it does not change the search score.</p>
        </details>
    </div>;
}
