import {useEffect, useRef, useState} from 'react';
import {getMei} from '../api/client';
import {prepareNotation} from '../search/notation';

// Load the engraving engine only when notation is requested, and initialise it once.
const loadToolkit = async () => {
    const [{default: createModule}, {VerovioToolkit}] = await Promise.all([import('verovio/wasm'), import('verovio/esm')]);
    return {module: await createModule(), VerovioToolkit};
};
let toolkitPromise: ReturnType<typeof loadToolkit> | undefined;

type Props = {
    pageId?: string | null;
    label: string;
    codestring: string;
    n: number;
    commonStarts: number[];
    selectedStarts: number[];
    followSelection?: boolean;
    onSelect: (position: number) => void;
};

export default function NotationPane({pageId, label, codestring, n, commonStarts, selectedStarts, followSelection, onSelect}: Props) {
    const container = useRef<HTMLDivElement>(null);
    const [rendered, setRendered] = useState<{svg: string; noteIds: string[]; aligned: boolean} | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!pageId) return;
        const controller = new AbortController();
        let active = true;
        const render = async () => {
            const mei = await getMei(pageId, controller.signal);
            const prepared = prepareNotation(mei, codestring);
            toolkitPromise ??= loadToolkit().catch(error => { toolkitPromise = undefined; throw error; });
            const {module, VerovioToolkit} = await toolkitPromise;
            if (!active) return;
            const toolkit = new VerovioToolkit(module);
            try {
                toolkit.setOptions({scale:40, pageWidth:1800, pageHeight:60000, adjustPageHeight:true, svgViewBox:true});
                if (!toolkit.loadData(prepared.mei)) throw new Error('Verovio could not draw this page.');
                const svg = Array.from({length: toolkit.getPageCount()}, (_, i) => toolkit.renderToSVG(i + 1)).join('');
                setRendered({svg, noteIds: prepared.noteIds, aligned: prepared.aligned});
            } finally { toolkit.destroy(); }
        };
        void render().catch(error => { if (active) setError(error instanceof Error ? error.message : 'Notation is unavailable.'); });
        return () => { active = false; controller.abort(); };
    }, [pageId, codestring]);

    useEffect(() => {
        if (!rendered?.aligned || !container.current) return;
        const common = new Set(commonStarts);
        const selected = new Set<number>();
        for (const start of selectedStarts) for (let i = start; i <= start + n; i++) selected.add(i);
        const index = new Map(rendered.noteIds.map((id, i) => [id, i]));
        for (const note of container.current.querySelectorAll<SVGGElement>('g.note')) {
            const i = index.get(note.id);
            if (i === undefined) continue;
            note.dataset.noteIndex = String(i);
            const matched = common.has(i);
            note.style.color = note.style.fill = note.style.stroke = selected.has(i) ? '#b45b00' : matched ? '#c52e7e' : '#16736b';
            if (matched) {
                note.setAttribute('tabindex', '0');
                note.setAttribute('role', 'button');
                note.setAttribute('aria-label', `${label} matching fragment at note ${i + 1}`);
                note.style.cursor = 'pointer';
            } else {
                note.removeAttribute('tabindex'); note.removeAttribute('role'); note.removeAttribute('aria-label');
            }
        }
        if (followSelection && selectedStarts.length) {
            const note = Array.from(container.current.querySelectorAll<SVGGElement>('g.note')).find(note => note.dataset.noteIndex === String(selectedStarts[0]));
            if (note) {
                const box = note.getBoundingClientRect(), viewport = container.current.getBoundingClientRect();
                if (box.top < viewport.top || box.bottom > viewport.bottom) container.current.scrollTop += box.top - viewport.top - viewport.height / 3;
            }
        }
    }, [rendered, commonStarts, selectedStarts, n, label, followSelection]);

    const selectNote = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return;
        const note = target.closest<SVGGElement>('g.note');
        if (note?.getAttribute('role') === 'button' && note.dataset.noteIndex !== undefined) onSelect(Number(note.dataset.noteIndex));
    };
    return <div className="notation-pane">
        <h3 className="h6">{label}{pageId && <> <small className="text-muted">{pageId}</small></>}</h3>
        {!pageId ? <p className="small">This query has an interval string but no notation file.</p>
            : error ? <p role="status" className="small">{error}</p>
                : !rendered ? <p role="status" className="small">Drawing notation…</p>
                    : <>
                        {!rendered.aligned && <p role="status" className="small">These notes differ from the indexed sequence, so matching highlights are unavailable.</p>}
                        <div ref={container} className="notation-svg" onPointerOver={event => selectNote(event.target)} onFocus={event => selectNote(event.target)}
                            onClick={event => selectNote(event.target)}
                            dangerouslySetInnerHTML={{__html: rendered.svg}} />
                    </>}
    </div>;
}
