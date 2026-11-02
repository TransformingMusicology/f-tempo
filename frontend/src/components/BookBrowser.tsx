import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router';
import type {PageMetadata} from '../api';
import {pageImageUrl} from '../config';
import {listPage, preserveBrowse} from '../util/browseState';

type Entry = {id: string; count?: number; first?: string; title?: string; notmusic?: boolean};
export default function BookBrowser({metadata, catalogues, panel}: {metadata: PageMetadata | null; catalogues: string[]; panel?: 'books' | 'pages'}) {
    const [data, setData] = useState<{total: number; entries: Entry[]} | null>(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const library = params.get('library') ?? metadata?.library ?? catalogues[0] ?? '';
    const selectedBook = params.has('library') ? params.get('book') ?? '' : metadata?.book ?? '';
    const book = panel === 'books' ? '' : selectedBook;
    const pageKey = book ? 'pagesPage' : 'booksPage';
    const offset = (listPage(params.get(pageKey)) - 1) * 60;
    function browse(update: (next: URLSearchParams) => void) {
        const next = preserveBrowse(new URLSearchParams(location.search), metadata);
        next.set('library', library);
        if (book) next.set('book', book);
        else if (panel !== 'books') next.delete('book');
        next.set('view', 'browse');
        update(next);
        navigate(`${location.pathname}?${next}`);
    }
    useEffect(() => {
        if (panel === 'pages' && !book) {setData(null); return;}
        const controller = new AbortController();
        setData(null); setError('');
        const params = new URLSearchParams({library, offset: String(offset)});
        if (book) params.set('book', book);
        fetch(`/api/browse?${params}`, {signal: controller.signal}).then(async response => {
            if (!response.ok) throw new Error('Could not load the book index.');
            return response.json();
        }).then(setData).catch(error => {if (!controller.signal.aborted) setError(error.message);});
        return () => controller.abort();
    }, [library, book, offset, panel]);
    function openPage(id: string) {
        browse(next => next.set('page', id));
    }
    return <div className="book-browser p-2">
        {panel !== 'pages' && <label className="d-block mb-2">Library <select className="form-select form-select-sm" value={library}
            onChange={e => browse(next => {next.set('library', e.target.value); next.delete('book'); next.delete('booksPage'); next.delete('pagesPage');})}>
            {catalogues.map(id => <option key={id}>{id}</option>)}
        </select></label>}
        {panel === 'pages' && !book && <p className="text-muted">Select a book to see its pages.</p>}
        {book && <div className="mb-2">{!panel && <><button className="btn btn-link btn-sm p-0" onClick={() => browse(next => {next.delete('book'); next.delete('pagesPage');})}>
            {library === 'cpdl' ? 'All composers' : 'All books'}</button> / </>}<strong>{book.replaceAll('_', ' ')}</strong></div>}
        {error && <p role="alert">{error}</p>}
        {!data && !error && !(panel === 'pages' && !book) && <p>Loading…</p>}
        {data && <>
            <div className="small text-muted mb-2">{data.total} {book ? (library === 'cpdl' ? 'scores' : 'pages') : (library === 'cpdl' ? 'composers' : 'books')}</div>
            <div className="book-contact-sheet">
                {data.entries.map(entry => <button key={entry.id} type="button"
                    className={`book-thumbnail ${(panel === 'books' ? selectedBook === entry.id : metadata?.siglum === entry.id || metadata?.score_id === entry.id.replace(/_part\d+$/, '')) ? 'selected' : ''}`}
                    onClick={() => {if (book) openPage(entry.id); else browse(next => {next.set('book', entry.id); next.delete('pagesPage');});}}>
                    {library !== 'cpdl' && <img loading="lazy" src={pageImageUrl(entry.first ?? entry.id)} alt=""/>}
                    <span>{entry.title ?? (book ? entry.id.split('_').slice(-2).join('_') : entry.id.replaceAll('_', ' '))}</span>
                    {entry.count !== undefined && <small>{entry.count} {library === 'cpdl' ? 'voices' : 'pages'}</small>}
                    {entry.notmusic && <small>Not music</small>}
                </button>)}
            </div>
            {data.total > 60 && <div className="d-flex justify-content-between mt-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={!offset} onClick={() => browse(next => next.set(pageKey, String(offset / 60)))}>Previous</button>
                <span>{offset + 1}–{Math.min(offset + 60, data.total)}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={offset + 60 >= data.total} onClick={() => browse(next => next.set(pageKey, String(offset / 60 + 2)))}>Next</button>
            </div>}
        </>}
    </div>;
}
