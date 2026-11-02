import {useState, type ReactNode} from 'react';
import ScoreOverlay, {type NoteRange} from './ScoreOverlay';

interface Props {
    heading: ReactNode;
    subheading?: ReactNode;
    /** Scan image; null when there is none (e.g. codestring queries). */
    imageUrl: string | null;
    imageAlt: string;
    meiId: string | null;
    titlepageUrl?: string | null;
    matches: number[][] | null;
    highlightRanges: NoteRange[];
    onHoverNote: (noteIndex: number | null) => void;
    showNotes: boolean;
    zoom: boolean;
    /** Extra toolbar buttons placed before the pane's own toggles. */
    actions?: ReactNode;
    children?: ReactNode;
    /** Rendered under the scan, e.g. the comparison controls on the query pane. */
    footer?: ReactNode;
}

/**
 * One side of the comparison: a heading, a toolbar and the scan with its
 * Verovio overlay. Owns the "hide scan" and "title page" toggles. Re-mount it
 * (via key) when the page changes so the toggles reset.
 */
export default function PagePane({
    heading, subheading, imageUrl, imageAlt, meiId, titlepageUrl, matches, highlightRanges, onHoverNote,
    showNotes, zoom, actions, children, footer,
}: Props) {
    const [showImage, setShowImage] = useState(true);
    const [showTitlePage, setShowTitlePage] = useState(false);

    const titlePageActive = showTitlePage && !!titlepageUrl;
    const scanVisible = showImage || !showNotes;

    return (
        <div className="card h-100">
            <div className="card-body py-2">
                <div className="fw-semibold">{heading}</div>
                {subheading && <div className="small text-muted">{subheading}</div>}
                <div className="pane-toolbar my-1">
                    {actions}
                    {imageUrl && showNotes && (
                        <button type="button" className="btn btn-outline-secondary btn-sm"
                                onClick={() => setShowImage(v => !v)}>
                            {showImage ? 'Hide scan' : 'Show scan'}
                        </button>
                    )}
                    {titlepageUrl && (
                        <button type="button" className={`btn btn-sm ${titlePageActive ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                onClick={() => setShowTitlePage(v => !v)} title="Show the title page of this book">
                            <img src="/img/tp_book.svg" alt="" height={16} className="me-1"/>
                            {titlePageActive ? 'Back to page' : 'Title page'}
                        </button>
                    )}
                </div>
                {children}
                {titlePageActive ? (
                    <div className="score-pane">
                        <img className="scan" src={titlepageUrl} alt="Title page of the book"/>
                    </div>
                ) : (
                    <ScoreOverlay imageUrl={imageUrl} imageAlt={imageAlt} meiId={meiId} matches={matches}
                                  highlightRanges={highlightRanges} onHoverNote={onHoverNote}
                                  showImage={scanVisible} showNotes={showNotes} zoom={zoom}/>
                )}
                {footer && <div className="mt-2">{footer}</div>}
            </div>
        </div>
    );
}
