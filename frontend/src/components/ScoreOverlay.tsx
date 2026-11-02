import {useEffect, useLayoutEffect, useRef, useState, type MouseEvent} from 'react';
import {prepareOverlay} from '../util/overlay';
import {getMei} from '../api';
import {loadVerovio} from '../util/verovio';

export type NoteRange = [start: number, end: number];

interface Props {
    imageUrl: string | null;
    imageAlt: string;
    /** Page whose MEI is rendered over the scan; null when no MEI can exist (uploads). */
    meiId: string | null;
    codestring?: string | null;
    /** For each interval index, positions of that n-gram on the other page. Colours the notes. */
    matches: number[][] | null;
    /** Note index ranges (inclusive) to outline. */
    highlightRanges: NoteRange[];
    onHoverNote: (noteIndex: number | null) => void;
    showImage: boolean;
    showNotes: boolean;
    zoom: boolean;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

type Status = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

const MATCH_COLOUR = 'HotPink';
const OTHER_COLOUR = 'Teal';
const LENS_SIZE = 280;
const LENS_FACTOR = 2.5;

function toUserSpace(svg: SVGSVGElement, x: number, y: number): DOMPoint | null {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(x, y).matrixTransform(matrix.inverse());
}

function userRect(svg: SVGSVGElement, element: Element): Box | null {
    const rect = element.getBoundingClientRect();
    const a = toUserSpace(svg, rect.left, rect.top);
    const b = toUserSpace(svg, rect.right, rect.bottom);
    if (!a || !b) return null;
    return {x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y};
}

/**
 * One box per system (or staff) spanned by the notes, from the first note's left
 * edge to the last note's right edge, bounded vertically by the staff lines.
 */
function boxesForNotes(svg: SVGSVGElement, notes: Element[]): Box[] {
    const groups = new Map<Element, Box>();
    for (const note of notes) {
        const staff = note.closest('.staff');
        const group = note.closest('.system') ?? staff;
        if (!staff || !group) continue;
        const noteBox = userRect(svg, note);
        if (!noteBox) continue;
        const existing = groups.get(group);
        if (existing) {
            const right = Math.max(existing.x + existing.width, noteBox.x + noteBox.width);
            existing.x = Math.min(existing.x, noteBox.x);
            existing.width = right - existing.x;
            continue;
        }
        const lines = staff.querySelectorAll('path');
        const first = lines[0] ? userRect(svg, lines[0]) : null;
        const last = lines[lines.length - 1] ? userRect(svg, lines[lines.length - 1]!) : null;
        const top = (first?.y ?? noteBox.y);
        const bottom = (last ? last.y + last.height : noteBox.y + noteBox.height);
        const margin = (bottom - top) * 0.3;
        groups.set(group, {x: noteBox.x, y: top - margin, width: noteBox.width, height: bottom - top + 2 * margin});
    }
    return Array.from(groups.values());
}

export default function ScoreOverlay({
    imageUrl, imageAlt, meiId, codestring, matches, highlightRanges, onHoverNote, showImage, showNotes, zoom,
}: Props) {
    const [svg, setSvg] = useState<string | null>(null);
    const [source, setSource] = useState<ReturnType<typeof prepareOverlay> | null>(null);
    const [mapped, setMapped] = useState(false);
    const aligned = mapped && codestring != null && source?.codestring === codestring.replace(/\s/g, '');
    const [status, setStatus] = useState<Status>('idle');
    const [imageFailed, setImageFailed] = useState(false);
    const [viewBox, setViewBox] = useState<string | null>(null);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [noteBoxes, setNoteBoxes] = useState<Box[]>([]);
    const [lens, setLens] = useState<{x: number; y: number} | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const notesRef = useRef<Element[]>([]);
    const noteIndex = useRef(new Map<Element, number>());

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    useEffect(() => {
        if (!meiId) {
            setSvg(null);
            setStatus('missing');
            return;
        }
        let cancelled = false;
        setStatus('loading');
        setSvg(null);
        setBoxes([]);
        (async () => {
            try {
                const [toolkit, mei] = await Promise.all([loadVerovio(), getMei(meiId)]);
                if (cancelled) return;
                if (!mei) {
                    setStatus('missing');
                    return;
                }
                const prepared = prepareOverlay(mei);
                const rendered = toolkit.renderData(prepared.mei, {});
                if (cancelled) return;
                setSvg(rendered);
                setSource(prepared);
                setStatus('ready');
            } catch (error) {
                console.error(error);
                if (!cancelled) setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [meiId]);

    // Index the rendered notes once the SVG is in the DOM.
    useLayoutEffect(() => {
        const container = overlayRef.current;
        if (!container || !svg) {
            notesRef.current = [];
            noteIndex.current = new Map();
            setViewBox(null);
            setNoteBoxes([]);
            return;
        }
        const renderedNotes = new Map(Array.from(container.querySelectorAll('g.note')).map(note => [note.id, note]));
        const ordered = source?.noteIds.map(id => renderedNotes.get(id)) ?? [];
        const complete = ordered.length > 0 && ordered.every(Boolean);
        const notes = complete ? ordered as Element[] : [];
        setMapped(complete);
        notesRef.current = notes;
        noteIndex.current = new Map(notes.map((note, index) => [note, index]));
        const root = container.querySelector('svg');
        setViewBox(root?.getAttribute('viewBox') ?? null);
        // Invisible hit areas make every note hoverable even where staff lines or stems would otherwise catch the pointer.
        setNoteBoxes(root ? notes.map(note => userRect(root, note) ?? {x: 0, y: 0, width: 0, height: 0}) : []);
    }, [svg, showNotes, source]);

    // Colour notes by whether the n-gram starting at them appears on the other page.
    useLayoutEffect(() => {
        notesRef.current.forEach((note, index) => {
            const colour = aligned && matches?.[index]?.length ? MATCH_COLOUR : OTHER_COLOUR;
            note.setAttribute('style', `fill: ${colour}; stroke: ${colour}; color: ${colour}`);
        });
    }, [matches, svg, showNotes, aligned]);

    // Outline the requested note ranges.
    useLayoutEffect(() => {
        const root = overlayRef.current?.querySelector('svg');
        if (!root || !aligned || !highlightRanges.length) {
            setBoxes([]);
            return;
        }
        const next: Box[] = [];
        for (const [start, end] of highlightRanges) {
            const notes = notesRef.current.slice(Math.max(0, start), Math.min(notesRef.current.length, end + 1));
            next.push(...boxesForNotes(root, notes));
        }
        setBoxes(next);
    }, [highlightRanges, svg, showNotes, aligned]);

    const alignmentWarning = codestring != null && status === 'ready' && !aligned
        ? 'These recognised notes differ from the indexed music. Match highlights are unavailable for this page.' : null;

    function handleMouseOver(event: MouseEvent<HTMLDivElement>) {
        if (!aligned) { onHoverNote(null); return; }
        const target = event.target as Element;
        const hit = target.closest?.('rect.note-hit');
        if (hit) {
            onHoverNote(Number(hit.getAttribute('data-index')));
            return;
        }
        const note = target.closest?.('g.note');
        onHoverNote(note ? (noteIndex.current.get(note) ?? null) : null);
    }

    function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
        if (!zoom || !imageRef.current || imageFailed || !showImage) {
            if (lens) setLens(null);
            return;
        }
        const rect = imageRef.current.getBoundingClientRect();
        setLens({x: event.clientX - rect.left, y: event.clientY - rect.top});
    }

    function handleMouseLeave() {
        onHoverNote(null);
        setLens(null);
    }

    const imageRect = imageRef.current?.getBoundingClientRect();
    // Keep the lens beside the pointer so the hovered passage stays visible.
    const lensStyle = lens && imageRect && imageUrl ? {
        left: lens.x + 24 + LENS_SIZE <= imageRect.width ? lens.x + 24 : Math.max(0, lens.x - 24 - LENS_SIZE),
        top: Math.max(0, Math.min(lens.y - LENS_SIZE / 2, imageRect.height - LENS_SIZE)),
        backgroundImage: `url("${imageUrl}")`,
        backgroundSize: `${imageRect.width * LENS_FACTOR}px ${imageRect.height * LENS_FACTOR}px`,
        backgroundPosition: `${-(lens.x * LENS_FACTOR - LENS_SIZE / 2)}px ${-(lens.y * LENS_FACTOR - LENS_SIZE / 2)}px`,
    } : null;

    const overlayInFlow = imageFailed || !imageUrl;

    return (
        <div className="score-pane" onMouseOver={handleMouseOver} onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}>
            {imageUrl && !imageFailed ? (
                <img ref={imageRef} className="scan" src={imageUrl} alt={imageAlt}
                     style={{visibility: showImage ? 'visible' : 'hidden'}}
                     onError={() => setImageFailed(true)}/>
            ) : (
                !(showNotes && svg) && <div className="scan-missing">{imageUrl ? 'Image not available' : 'No image'}</div>
            )}
            {showNotes && svg && (
                <div ref={overlayRef} className={`score-overlay${overlayInFlow ? ' in-flow' : ''}`}
                     dangerouslySetInnerHTML={{__html: svg}}/>
            )}
            {showNotes && viewBox && (
                <svg className="score-highlights" viewBox={viewBox} aria-hidden="true">
                    {boxes.map((box, i) => (
                        <rect key={i} x={box.x} y={box.y} width={box.width} height={box.height}
                              fill="orange" fillOpacity={0.3} stroke="orange" strokeWidth={8}/>
                    ))}
                    {noteBoxes.map((box, i) => (
                        <rect key={`n${i}`} className="note-hit" data-index={i}
                              x={box.x} y={box.y} width={box.width} height={box.height}
                              fill="transparent" pointerEvents="all"
                              style={{cursor: matches?.[i]?.length ? 'pointer' : 'default'}}/>
                    ))}
                </svg>
            )}
            {lensStyle && <div className="zoom-lens" style={lensStyle}/>}
            {showNotes && status === 'loading' && <div className="small text-muted">Loading recognised notes…</div>}
            {showNotes && status === 'missing' && meiId && (
                <div className="small text-muted">No recognised notes are available for this page.</div>
            )}
            {showNotes && status === 'error' && (
                <div className="small text-danger">Could not render the recognised notes.</div>
            )}
            {showNotes && alignmentWarning && <div className="small text-warning">{alignmentWarning}</div>}
        </div>
    );
}
