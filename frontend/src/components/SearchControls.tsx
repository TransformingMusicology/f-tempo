import {useId, type FormEvent, type ReactNode} from 'react';
import {validSettings, type SearchSettings} from '../util/params';
import SettingsFields from './SettingsFields';

interface Props {
    mode: 'id' | 'code';
    settings: SearchSettings;
    catalogues: string[];
    target: string;
    onTargetChange: (value: string) => void;
    onSubmit: () => void;
    onSettingsChange: (settings: SearchSettings) => void;
    onRepeat: (() => void) | null;
    busy: boolean;
    /** Rendered under the target input, e.g. validation feedback. */
    message?: ReactNode;
    formRef?: React.RefObject<HTMLFormElement | null>;
    /** ID mode only: whether the page-ID box is shown; when hidden, Search uses the displayed page. */
    showTarget?: boolean;
    onShowTarget?: () => void;
}

export default function SearchControls({
    mode, settings, catalogues, target, onTargetChange, onSubmit, onSettingsChange, onRepeat, busy, message, formRef,
    showTarget = true, onShowTarget,
}: Props) {
    const ids = useId();
    const noCollections = (settings.collections ?? catalogues).length === 0;
    const targetEmpty = target.trim().length === 0;
    const targetVisible = mode === 'code' || showTarget;

    function submit(event: FormEvent) {
        event.preventDefault();
        if (busy || targetEmpty || noCollections || !validSettings(settings)) return;
        // Leave the text box so the arrow-key shortcuts work on the results straight away.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        onSubmit();
    }

    return (
        <form ref={formRef} onSubmit={submit} className="search-controls">
            {targetVisible && (
                <div className="mb-2">
                    <label htmlFor={`${ids}-target`} className="form-label mb-0">
                        {mode === 'id' ? 'Page ID to search' : 'Interval codestring to search'}
                    </label>
                    {mode === 'id' ? (
                        <input id={`${ids}-target`} className="form-control form-control-sm page-id" value={target}
                               onChange={e => onTargetChange(e.target.value)} spellCheck={false} autoComplete="off"
                               autoFocus/>
                    ) : (
                        <textarea id={`${ids}-target`} className="form-control form-control-sm font-monospace" rows={4}
                                  value={target} onChange={e => onTargetChange(e.target.value)} spellCheck={false}/>
                    )}
                    {message}
                </div>
            )}

            <SettingsFields settings={settings} catalogues={catalogues} onChange={onSettingsChange}/>

            <div className="d-flex gap-2 align-items-center flex-wrap">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || targetEmpty || noCollections || !validSettings(settings)}
                        title={mode === 'id' && !showTarget ? 'Search with the displayed page (Enter)' : undefined}>
                    {mode === 'id' && !showTarget ? 'Search this page' : 'Search'}
                </button>
                {onRepeat && (
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onRepeat} disabled={busy}>
                        Repeat last search
                    </button>
                )}
                {busy && <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-label="Searching"/>}
            </div>
            {mode === 'id' && !showTarget && onShowTarget && (
                <div className="mt-2 small">
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={onShowTarget}>Enter a page ID</button>
                </div>
            )}
        </form>
    );
}
