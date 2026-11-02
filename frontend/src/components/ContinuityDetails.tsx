import type {SearchResult} from '../api';

export default function ContinuityDetails({result, evidence, queryLength, cursor, onHover}: {
    evidence?: SearchResult['continuity'];
    result: SearchResult | null; queryLength: number; cursor: number | null; onHover: (index: number | null) => void;
}) {
    if (!evidence || !result) return null;
    const matchLength = result.codestring.replace(/\s/g, '').length;
    return <div className="small mt-2">
        <p className="mb-1">Pink: shared patterns. Teal: other notes. Orange: corresponding passages. Hover a pink note to compare its matches.</p>
        {evidence.status === 'too-large' && <p>The pair is too large for the passage graph; note comparison remains available.</p>}
        <details onToggle={event => { if (!event.currentTarget.open) onHover(null); }}>
            <summary>Matching passage graph</summary>
            <svg viewBox="0 0 440 230" role="img" aria-label="Positions of matching passages" style={{width: '100%', maxWidth: 440}}
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
            <p>Move across the graph to highlight corresponding notes in either scans or scores. Gaps have no matching passage.</p>
            <p>This comparison uses {evidence.n}-interval patterns. Changing it does not filter or reorder search results.</p>
        </details>
    </div>;
}
