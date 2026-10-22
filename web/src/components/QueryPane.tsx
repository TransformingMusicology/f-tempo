import {useState} from 'react';
import {Alert, Button, ButtonGroup} from 'react-bootstrap';
import {useNavigate} from 'react-router';
import {getNextId, getRandomPage} from '../api/client';
import type {PageMetadata} from '../api/types';
import {scanImageUrl} from '../config';
import {pageUrl, type SearchOptions} from '../search/params';
import ScanImage from './ScanImage';
import {TitlePageButton, TitlePageImage, useTitlePageHold} from './TitlePageHold';

export type QueryDescription =
    | {kind: 'page'; page: PageMetadata}
    | {kind: 'code'; codestring: string; uploadedImageUrl?: string};

type Props = {
    query: QueryDescription;
};

/**
 * Navigation among pages and books. Exposed as a hook so keyboard shortcuts share it with the buttons.
 */
export function usePageNavigation(query: QueryDescription, options: SearchOptions) {
    const navigate = useNavigate();
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const page = query.kind === 'page' ? query.page : null;

    const run = async (work: () => Promise<void>) => {
        if (busy) return;
        setBusy(true);
        setNotice(null);
        try {
            await work();
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Navigation failed');
        } finally {
            setBusy(false);
        }
    };

    const changePage = (direction: 'prev' | 'next') => {
        if (!page) return;
        void run(async () => {
            const next = await getNextId(page.library, page.book, page.id, direction);
            if (next.page.id === page.id) {
                setNotice(`This is the ${direction === 'prev' ? 'first' : 'last'} page of book ${page.book}.`);
            } else {
                navigate(pageUrl(next.page.id, options));
            }
        });
    };

    const changeBook = (direction: 'prev' | 'next') => {
        if (!page) return;
        void run(async () => {
            const next = await getNextId(page.library, page.book, null, direction);
            if (next.book_id === page.book) {
                setNotice(`${page.book} is the ${direction === 'prev' ? 'first' : 'last'} book in ${page.library}.`);
            } else {
                navigate(pageUrl(next.page.id, options));
            }
        });
    };

    const randomPage = () => {
        void run(async () => {
            const random = await getRandomPage();
            navigate(pageUrl(random.id, options));
        });
    };

    return {changePage, changeBook, randomPage, notice, busy, canNavigate: page !== null};
}

export default function QueryPane({query, navigation}: Props & {navigation: ReturnType<typeof usePageNavigation>}) {
    const {held, setHeld} = useTitlePageHold();
    const {changePage, changeBook, randomPage, notice, busy, canNavigate} = navigation;

    return (
        <div className="pane query-pane">
            <div className="pane-toolbar">
                {/* Clicks during a pending lookup are ignored by the navigation hook; the buttons are not
                    visually disabled because the lookup is brief and the style change flickers. */}
                <ButtonGroup size="sm" aria-busy={busy}>
                    <Button variant="outline-secondary" disabled={!canNavigate} onClick={() => changeBook('prev')} title="Previous book (Shift+←)">« Book</Button>
                    <Button variant="outline-secondary" disabled={!canNavigate} onClick={() => changePage('prev')} title="Previous page (←)">‹ Page</Button>
                    <Button variant="secondary" onClick={randomPage} title="Random page (\)">Random</Button>
                    <Button variant="outline-secondary" disabled={!canNavigate} onClick={() => changePage('next')} title="Next page (→)">Page ›</Button>
                    <Button variant="outline-secondary" disabled={!canNavigate} onClick={() => changeBook('next')} title="Next book (Shift+→)">Book »</Button>
                </ButtonGroup>
            </div>
            {query.kind === 'page' ? (
                <>
                    <div className="pane-heading">
                        <span className="pane-label">Query page</span> <code>{query.page.id}</code>
                        <TitlePageButton titlepage={query.page.titlepage} label={query.page.id} setHeld={setHeld} />
                    </div>
                    <p className="pane-info small text-muted mb-1">Library {query.page.library}, book {query.page.book}.</p>
                    {held && query.page.titlepage
                        ? <TitlePageImage titlepage={query.page.titlepage} label={query.page.id} />
                        : <ScanImage src={scanImageUrl(query.page.id)} alt={`Scan of ${query.page.id}`} />}
                </>
            ) : (
                <>
                    <div className="pane-heading"><span className="pane-label">Query codestring</span></div>
                    <p className="pane-info small text-muted mb-1">
                        {query.codestring.length} intervals{query.uploadedImageUrl
                            ? ', recognised from the uploaded image (kept for this session only).'
                            : '. There is no page scan for this query.'}
                    </p>
                    {query.uploadedImageUrl && <ScanImage src={query.uploadedImageUrl} alt="Uploaded image" />}
                    <pre className="codestring">{query.codestring}</pre>
                </>
            )}
            {notice && <Alert variant="info" className="py-1 my-2 small">{notice}</Alert>}
        </div>
    );
}
