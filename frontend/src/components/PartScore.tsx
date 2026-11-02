import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {getMei, getMetadata} from '../api';
import {loadVerovio} from '../util/verovio';
import {prepareScorePart} from '../util/scorePart';

interface Props {
    id: string;
    compare: boolean;
    codestring: string | null;
    matches: number[][] | null;
    ranges: [number, number][];
    onHoverNote: (index: number | null) => void;
}

export default function PartScore({id, compare, codestring, matches, ranges, onHoverNote}: Props) {
    const [onlyPart, setOnlyPart] = useState(false);
    const [pages, setPages] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const [label, setLabel] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<ReturnType<typeof prepareScorePart> | null>(null);
    const container = useRef<HTMLDivElement>(null);
    const aligned = !!source && codestring != null && source.codestring === codestring.replace(/\s/g, '');

    useEffect(() => {
        let cancelled = false;
        setPages([]); setError(null); setSource(null);
        (async () => {
            try {
                const [mei, metadata] = await Promise.all([getMei(id), getMetadata(id), loadVerovio()]);
                if (cancelled) return;
                if (!mei || !metadata?.part_number) throw new Error('Score or voice metadata is unavailable');
                const prepared = prepareScorePart(mei, String(metadata.part_number), onlyPart);
                // Keep score pagination settings separate from the scan overlay toolkit.
                const toolkit = new window.verovio!.toolkit();
                let rendered: string[];
                try {
                    toolkit.renderData(prepared.mei, {breaks: 'auto', pageWidth: 1800, pageHeight: 2400, footer: 'none', svgViewBox: true});
                    rendered = Array.from({length: toolkit.getPageCount()}, (_, i) => toolkit.renderToSVG(i + 1, {}));
                } finally { toolkit.destroy(); }
                if (!rendered.length) throw new Error('The score could not be rendered');
                setPages(rendered); setSource(prepared); setPage(0);
                setLabel(metadata.part_name || `Part ${metadata.part_number}`);
            } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not render score'); }
        })();
        return () => { cancelled = true; };
    }, [id, onlyPart]);

    useEffect(() => {
        if (!compare || !aligned || !source || !pages.length) return;
        const index = ranges[0]?.[0] ?? matches?.findIndex(m => m.length > 0) ?? -1;
        if (index < 0) return;
        const noteId = source.noteIds[index];
        const target = pages.findIndex(svg => new DOMParser().parseFromString(svg, 'image/svg+xml').getElementById(noteId!) !== null);
        if (target >= 0) setPage(target);
    }, [pages, aligned, source, ranges, matches, compare]);

    useLayoutEffect(() => {
        if (!source || !container.current) return;
        const indices = new Map(source.noteIds.map((id, i) => [id, i]));
        const staffIds = new Set(source.staffIds);
        container.current.querySelectorAll('.voice-band, .passage-outline').forEach(el => el.remove());
        const svgNS = 'http://www.w3.org/2000/svg';
        container.current.querySelectorAll<SVGGElement>('g.staff').forEach(staff => {
            if (!staffIds.has(staff.id)) return;
            const box = staff.getBBox();
            const band = document.createElementNS(svgNS, 'rect');
            band.setAttribute('class', 'voice-band');
            band.setAttribute('x', String(box.x - 20)); band.setAttribute('y', String(box.y - 30));
            band.setAttribute('width', String(box.width + 40)); band.setAttribute('height', String(box.height + 60));
            band.setAttribute('fill', '#d8f3ed'); band.setAttribute('pointer-events', 'none');
            if (!onlyPart) staff.insertBefore(band, staff.firstChild);
            if (compare && aligned) {
                for (const [a, b] of ranges) {
                    const notes = Array.from(staff.querySelectorAll<SVGGElement>('g.note')).filter(n => {
                        const i = indices.get(n.id); return i !== undefined && i >= a && i <= b;
                    });
                    if (!notes.length) continue;
                    const boxes = notes.map(n => n.getBBox());
                    const x = Math.min(...boxes.map(b => b.x));
                    const right = Math.max(...boxes.map(b => b.x + b.width));
                    const rect = document.createElementNS(svgNS, 'rect');
                    rect.setAttribute('class', 'passage-outline');
                    rect.setAttribute('x', String(x - 10)); rect.setAttribute('y', String(box.y - 15));
                    rect.setAttribute('width', String(right - x + 20)); rect.setAttribute('height', String(box.height + 30));
                    rect.setAttribute('fill', 'orange'); rect.setAttribute('fill-opacity', '0.3');
                    rect.setAttribute('stroke', 'orange'); rect.setAttribute('stroke-width', '8');
                    rect.setAttribute('pointer-events', 'none'); staff.insertBefore(rect, onlyPart ? staff.firstChild : band.nextSibling);
                }
            }
        });
        container.current.querySelectorAll<SVGGElement>('g.note').forEach(note => {
            const i = indices.get(note.id);
            if (i === undefined) return;
            const highlighted = compare && aligned && !!matches?.[i]?.length;
            note.style.color = note.style.fill = note.style.stroke = !compare ? 'black' : highlighted ? 'HotPink' : 'Teal';
            note.dataset.noteIndex = String(i);
        });
    }, [pages, page, source, ranges, matches, aligned, compare, onlyPart]);

    return <div>
        <div className="d-flex gap-2 align-items-center my-2 flex-wrap">
            <strong>{label}</strong>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOnlyPart(v => !v)}>
                {onlyPart ? 'Show full score' : 'Only matching part'}
            </button>
            {pages.length > 1 && <>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span>Score page {page + 1} / {pages.length}</span>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page === pages.length - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </>}
        </div>
        {error ? <div role="alert">{error}</div> : !pages.length ? <div>Rendering score…</div> :
            <div ref={container} className="cpdl-score" onMouseOver={event => {
                const note = (event.target as Element).closest('[data-note-index]');
                onHoverNote(compare && aligned && note ? Number(note.getAttribute('data-note-index')) : null);
            }} onMouseLeave={() => onHoverNote(null)} dangerouslySetInnerHTML={{__html: pages[page]!}}/>}
        {source && codestring && !aligned && <div className="text-warning small">Score notes do not match the indexed voice; passage highlighting is unavailable.</div>}
    </div>;
}
