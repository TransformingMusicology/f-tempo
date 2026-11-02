import {useMemo, useState} from 'react';
import {Form} from 'react-bootstrap';
import {continuity, intervalSymbols} from '../../../lib/continuity';

function positions(symbols: string[], n: number) {
    const index = new Map<string, number[]>();
    for (let i = 0; i + n <= symbols.length; i++) {
        const gram = symbols.slice(i, i + n).join('');
        const found = index.get(gram);
        if (found) found.push(i); else index.set(gram, [i]);
    }
    return index;
}

/** Image-independent view of the same interval positions used by the server scorer. */
export default function ContinuityComparison({query, match}: {query: string; match: string}) {
    const [n, setN] = useState(5);
    const [side, setSide] = useState<'query' | 'match'>('query');
    const [position, setPosition] = useState(0);
    const analysis = useMemo(() => {
        const result = continuity(query, match, n);
        const a = intervalSymbols(query), b = intervalSymbols(match);
        // Do not build a potentially huge visualisation for an unscored pair.
        if (result.status !== 'ok' || a.length < n || b.length < n) return {result, a, b, ai: new Map<string, number[]>(), bi: new Map<string, number[]>(), dots: [], truncated: false};
        const ai = positions(a, n), bi = positions(b, n);
        const dots: [number, number][] = [];
        let truncated = false;
        outer: for (const [gram, starts] of ai) {
            for (const i of starts) for (const j of bi.get(gram) ?? []) {
                if (dots.length === 5000) { truncated = true; break outer; }
                dots.push([i, j]);
            }
        }
        return {result, a, b, ai, bi, dots, truncated};
    }, [query, match, n]);
    const {result, a, b, ai, bi, dots, truncated} = analysis;
    const source = side === 'query' ? a : b;
    const maximum = Math.max(0, source.length - n);
    const start = Math.min(position, maximum);
    const gram = source.slice(start, start + n).join('');
    const matches = source.length >= n ? (side === 'query' ? bi : ai).get(gram) ?? [] : [];
    const x = (i: number) => 30 + i / Math.max(1, a.length) * 540;
    const y = (j: number) => 15 + j / Math.max(1, b.length) * 140;
    const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

    return <section className="continuity-comparison border rounded p-2 mb-2" aria-label="Continuity comparison">
        <h2 className="h6">Shared passage continuity</h2>
        <Form.Group controlId="comparison-ngram" className="d-flex align-items-center gap-2 mb-1">
            <Form.Label className="small mb-0">N-gram length</Form.Label>
            <Form.Select size="sm" style={{width: 'auto'}} value={n} onChange={e => setN(Number(e.target.value))}>
                {Array.from({length: 10}, (_, i) => i + 3).map(value => <option key={value}>{value}</option>)}
            </Form.Select>
        </Form.Group>
        <p className="small text-muted mb-1">Comparison only; search ranking and its minimum use 5 intervals.</p>
        {result.status === 'too-large' ? <p role="status">This pair is too large for interactive continuity scoring.</p> : <>
            <p className="small mb-1">Continuity <strong>{percent(result.score)}</strong> · {result.coveredIntervals} matched intervals.
                {' '}Query coverage {percent(result.queryCoverage)}; result coverage {percent(result.matchCoverage)}.</p>
            <svg viewBox="0 0 600 180" role="img" aria-label="Shared n-gram positions: query left to right, result top to bottom. Blue segments show the strongest coherent chain."
                style={{width: '100%', background: '#fafafa'}}>
                <path d="M30 15V155H570" stroke="#777" fill="none" />
                <path d={dots.map(([i, j]) => `M${x(i)},${y(j)}h1`).join('')} stroke="#d94a8d" strokeWidth="2" />
                {result.passages.map(p => <line key={`${p.queryStart}:${p.matchStart}`} x1={x(p.queryStart)} y1={y(p.matchStart)}
                    x2={x(p.queryStart + p.length)} y2={y(p.matchStart + p.length)} stroke="#0065bd" strokeWidth="3" />)}
                {side === 'query'
                    ? <line x1={x(start)} x2={x(start)} y1="15" y2="155" stroke="#a65a00" />
                    : <line x1="30" x2="570" y1={y(start)} y2={y(start)} stroke="#a65a00" />}
                {matches.slice(0, 5000).map(other => <circle key={other} cx={x(side === 'query' ? start : other)} cy={y(side === 'query' ? other : start)} r="3" fill="#a65a00" />)}
                <text x="240" y="175" fontSize="12">Query interval position →</text>
                <text x="3" y="12" fontSize="11">Result ↓</text>
            </svg>
            <p className="small text-muted mb-1">Pink: shared fragments. Blue: strongest chain. Orange: selected fragment.
                {truncated && ' Pink dots limited to the first 5,000; scoring uses the full sequences.'}</p>
            <Form.Group controlId="comparison-side" className="mb-1">
                <Form.Label className="small mb-0">Scan through</Form.Label>
                <Form.Select size="sm" value={side} onChange={e => { setSide(e.target.value as 'query' | 'match'); setPosition(0); }}>
                    <option value="query">Query</option><option value="match">Result</option>
                </Form.Select>
            </Form.Group>
            <Form.Group controlId="comparison-position">
                <Form.Label className="small mb-0">Starting interval {source.length >= n ? start + 1 : '—'}</Form.Label>
                <Form.Range min={0} max={maximum} step={1} value={start} disabled={source.length < n} onChange={e => setPosition(Number(e.target.value))} />
            </Form.Group>
            <p className="small mb-1"><code>{gram || '—'}</code> occurs at {side === 'query' ? 'result' : 'query'} interval{matches.length === 1 ? '' : 's'}:
                {' '}{matches.length ? matches.slice(0, 30).map(i => i + 1).join(', ') : 'none'}{matches.length > 30 ? ` … (${matches.length} occurrences)` : ''}.</p>
            <details className="small"><summary>How the score works</summary>
                Matching anchors contribute only newly covered intervals. Each skipped interval on either side costs half a point.
                The strongest chain’s score is divided by the shorter sequence length. This is experimental evidence of continuity, not a probability of identity.
                Repeated fragments may have many pink matches; the blue chain chooses a coherent sequence.
            </details>
        </>}
    </section>;
}
