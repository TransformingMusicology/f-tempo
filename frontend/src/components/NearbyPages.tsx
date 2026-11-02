import {useEffect, useState} from 'react';
import {pageImageUrl} from '../config';
import PagePane from './PagePane';

type Page = {id: string; title?: string; notmusic?: boolean};
export default function NearbyPages({id, library, book, onSearch}: {
    id: string; library: string; book: string; onSearch: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [pages, setPages] = useState<Page[]>([]);
    const [preview, setPreview] = useState<Page | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {setOpen(false); setPages([]); setPreview(null);}, [id]);
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setError('');
        const params = new URLSearchParams({library, book, locate: id});
        fetch(`/api/browse?${params}`, {signal: controller.signal}).then(async response => {
            if (!response.ok) throw new Error('Could not load nearby pages.');
            const data = await response.json();
            setPages(data.nearby);
        }).catch(error => {if (!controller.signal.aborted) setError(error.message);});
        return () => controller.abort();
    }, [open, id, library, book]);
    return <div className="nearby-pages mt-2">
        <button className="btn btn-outline-secondary btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>Nearby pages</button>
        {open && <>
            {error && <p role="alert">{error}</p>}
            {!pages.length && !error && <p>Loading…</p>}
            <div className="nearby-strip" aria-label="Nearby pages in this book">
                {pages.map(page => <button key={page.id} className={`book-thumbnail ${page.id === id || page.id === preview?.id ? 'selected' : ''}`}
                    onClick={() => setPreview(page)} title={page.title ?? page.id}>
                    {library !== 'cpdl' && <img loading="lazy" src={pageImageUrl(page.id)} alt=""/>}
                    <span>{page.title ?? page.id.split('_').slice(-2).join('_')}</span>
                </button>)}
            </div>
            {preview && <div className="nearby-preview mt-2">
                <PagePane key={preview.id} heading={<>Preview: {preview.title ?? preview.id}</>}
                    imageUrl={library === 'cpdl' ? null : pageImageUrl(preview.id)} imageAlt={`Preview of ${preview.id}`}
                    meiId={preview.id} codestring={null} titlepageUrl={null} matches={[]} highlightRanges={[]}
                    onHoverNote={() => {}} showNotes={false} zoom={false}
                    actions={<>
                        <button className="btn btn-primary btn-sm me-2" disabled={preview.notmusic} onClick={() => onSearch(preview.id)}>Search this page</button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setPreview(null)}>Close preview</button>
                    </>}/>
            </div>}
        </>}
    </div>;
}
