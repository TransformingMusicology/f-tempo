import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {PageMetadata} from '../api';
import type {SearchSettings} from '../util/params';
import SettingsFields, {describeSettings} from './SettingsFields';

interface Props {
    displayedId: string | null;
    metadata: PageMetadata | null;
    searched: boolean;
    settings: SearchSettings;
    catalogues: string[];
    busy: boolean;
    onStep: (direction: 'prev' | 'next', unit: 'page' | 'book') => void;
    onRandom: () => void;
    onSearch: (pageId: string) => void;
    onSettingsChange: (settings: SearchSettings) => void;
    onRepeat: (() => void) | null;
}

/**
 * The query strip of the explore layout: where you are, how to move, what to
 * search with, and a one-line summary of the search options that opens into
 * the full controls.
 */
export default function QueryBar({
    displayedId, metadata, searched, settings, catalogues, busy, onStep, onRandom, onSearch, onSettingsChange, onRepeat,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(displayedId ?? '');
    const [optionsOpen, setOptionsOpen] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setDraft(displayedId ?? ''); setEditing(false); }, [displayedId]);

    useEffect(() => {
        if (!optionsOpen) return;
        function onDown(event: MouseEvent) {
            if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) setOptionsOpen(false);
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [optionsOpen]);

    function submit(event: FormEvent) {
        event.preventDefault();
        const id = draft.trim();
        if (!id) return;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setEditing(false);
        onSearch(id);
    }

    const noCollections = (settings.collections ?? catalogues).length === 0;

    return (
        <div className="query-bar">
            <div className="btn-group btn-group-sm" role="group" aria-label="Browse pages">
                <button type="button" className="btn btn-outline-secondary" onClick={() => onStep('prev', 'book')} title="Previous book (Shift+←)">« Book</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => onStep('prev', 'page')} title="Previous page (←)">‹ Page</button>
                <button type="button" className="btn btn-outline-secondary" onClick={onRandom} title="Random page (backslash)">Random</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => onStep('next', 'page')} title="Next page (→)">Page ›</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => onStep('next', 'book')} title="Next book (Shift+→)">Book »</button>
            </div>

            <form className="query-id-form" onSubmit={submit}>
                <span className="text-muted small">{searched ? 'Query' : 'Page'}</span>
                {editing ? (
                    <input className="form-control form-control-sm page-id query-id-input" value={draft} autoFocus
                           onChange={e => setDraft(e.target.value)} spellCheck={false} autoComplete="off"
                           onKeyDown={e => { if (e.key === 'Escape') { setDraft(displayedId ?? ''); setEditing(false); } }}
                           aria-label="Page ID to search"/>
                ) : (
                    <button type="button" className="btn btn-link btn-sm p-0 page-id query-id-text" title="Click to enter a page ID"
                            onClick={() => setEditing(true)}>
                        {displayedId}
                    </button>
                )}
                {metadata && !editing && (
                    <span className="text-muted small d-none d-xl-inline">{metadata.library} · {metadata.book}</span>
                )}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || noCollections || !draft.trim()}
                        title="Search with this page (Enter)">
                    {busy ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Searching"/> : 'Search'}
                </button>
                {onRepeat && (
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onRepeat} disabled={busy}>
                        Repeat last
                    </button>
                )}
            </form>

            <div className="query-options" ref={optionsRef}>
                <button type="button" className={`btn btn-sm ${optionsOpen ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        aria-expanded={optionsOpen} onClick={() => setOptionsOpen(v => !v)}>
                    {describeSettings(settings, catalogues)} ▾
                </button>
                {optionsOpen && (
                    <div className="query-options-panel card shadow-sm">
                        <div className="card-body py-2">
                            <SettingsFields settings={settings} catalogues={catalogues} onChange={onSettingsChange}/>
                            <div className="form-text">Changes re-run the current search.</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
