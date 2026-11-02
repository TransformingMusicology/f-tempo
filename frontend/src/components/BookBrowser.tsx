import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router';
import type {PageMetadata} from '../api';
import {pageImageUrl} from '../config';
import {setScoreTarget} from '../util/scoreUrl';

type Entry = {id: string; count?: number; first?: string; title?: string; notmusic?: boolean};
export default function BookBrowser({metadata, catalogues}: {metadata: PageMetadata | null; catalogues: string[]}) {
    const [library, setLibrary] = useState(metadata?.library ?? catalogues[0] ?? '');
    const [book, setBook] = useState(metadata?.book ?? '');
    const [offset, setOffset] = useState(0);
    const [data, setData] = useState<{total: number; entries: Entry[]} | null>(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        if (metadata) {setLibrary(metadata.library); setBook(metadata.book); setOffset(0);}
    }, [metadata?.library, metadata?.book]);
    useEffect(() => {
        const controller = new AbortController();
        setData(null); setError('');
        const params = new URLSearchParams({library, offset: String(offset)});
        if (book) params.set('book', book);
        fetch(`/api/browse?${params}`, {signal: controller.signal}).then(async response => {
            if (!response.ok) throw new Error('Could not load the book index.');
            return response.json();
        }).then(setData).catch(error => {if (!controller.signal.aborted) setError(error.message);});
        return () => controller.abort();
    }, [library, book, offset]);
    function openPage(id: string) {
        const params = new URLSearchParams(location.search);
        params.delete('q'); params.delete('sel');
        setScoreTarget(params, 'page', id);
        navigate(`${location.pathname}?${params}`);
    }
    return <div className="book-browser p-2">
        <label className="d-block mb-2">Library <select className="form-select form-select-sm" value={library}
            onChange={e => {setLibrary(e.target.value); setBook(''); setOffset(0);}}>
            {catalogues.map(id => <option key={id}>{id}</option>)}
        </select></label>
        {book && <div className="mb-2"><button className="btn btn-link btn-sm p-0" onClick={() => {setBook(''); setOffset(0);}}>
            {library === 'cpdl' ? 'All composers' : 'All books'}</button> / <strong>{book.replaceAll('_', ' ')}</strong></div>}
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p>Loading…</p>}
        {data && <>
            <div className="small text-muted mb-2">{data.total} {book ? (library === 'cpdl' ? 'scores' : 'pages') : (library === 'cpdl' ? 'composers' : 'books')}</div>
            <div className="book-contact-sheet">
                {data.entries.map(entry => <button key={entry.id} type="button"
                    className={`book-thumbnail ${metadata?.siglum === entry.id || metadata?.score_id === entry.id.replace(/_part\d+$/, '') ? 'selected' : ''}`}
                    onClick={() => {if (book) openPage(entry.id); else {setBook(entry.id); setOffset(0);}}}>
                    {library !== 'cpdl' && <img loading="lazy" src={pageImageUrl(entry.first ?? entry.id)} alt=""/>}
                    <span>{entry.title ?? (book ? entry.id.split('_').slice(-2).join('_') : entry.id.replaceAll('_', ' '))}</span>
                    {entry.count !== undefined && <small>{entry.count} {library === 'cpdl' ? 'voices' : 'pages'}</small>}
                    {entry.notmusic && <small>Not music</small>}
                </button>)}
            </div>
            {data.total > 60 && <div className="d-flex justify-content-between mt-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={!offset} onClick={() => setOffset(offset - 60)}>Previous</button>
                <span>{offset + 1}–{Math.min(offset + 60, data.total)}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={offset + 60 >= data.total} onClick={() => setOffset(offset + 60)}>Next</button>
            </div>}
        </>}
    </div>;
}
