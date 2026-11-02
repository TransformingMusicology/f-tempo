// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, useLocation, useNavigate} from 'react-router';
import {expect, test, vi} from 'vitest';
import BookBrowser from './BookBrowser';

test('contact sheet selection browses without rerunning the existing query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true, json:async () => ({total:1, entries:[{id:'GB-Lbl_A19_002_0'}]})}));
    const host = document.createElement('div');
    const root = createRoot(host);
    let path = '';
    function Probe() {path = useLocation().search; return null;}
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/explore?q=GB-Lbl_A19_001_1&coll=cpdl&sel=old']}>
            <BookBrowser metadata={{siglum:'GB-Lbl_A19_001_1',library:'GB-Lbl',book:'A19'}} catalogues={['GB-Lbl']}/><Probe/>
        </MemoryRouter>));
        await act(async () => (host.querySelector('.book-thumbnail') as HTMLButtonElement).click());
        const params = new URLSearchParams(path);
        expect(params.get('page')).toBe('GB-Lbl_A19_002_0');
        expect(params.get('coll')).toBe('cpdl');
        expect(params.get('view')).toBe('browse');
        expect(params.get('q')).toBe('GB-Lbl_A19_001_1');
        expect(params.get('sel')).toBe('old');
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});

test('a shared library list link restores pagination and Back restores the previous list page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok:true, json:async () => ({total:212, entries:[{id:'A19', count:120, first:'GB-Lbl_A19_001_1'}]})});
    vi.stubGlobal('fetch', fetchMock);
    const host = document.createElement('div');
    const root = createRoot(host);
    let path = '';
    function Probe() {path = useLocation().search; const navigate = useNavigate(); return <button id="back" onClick={() => navigate(-1)}>Back</button>;}
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/explore?library=GB-Lbl&booksPage=3']}>
            <BookBrowser metadata={null} catalogues={['GB-Lbl']}/><Probe/>
        </MemoryRouter>));
        expect(fetchMock.mock.calls[0]?.[0]).toContain('offset=120');
        await act(async () => (host.querySelector('.book-thumbnail') as HTMLButtonElement).click());
        expect(new URLSearchParams(path).get('book')).toBe('A19');
        expect(new URLSearchParams(path).get('booksPage')).toBe('3');
        await act(async () => (host.querySelector('#back') as HTMLButtonElement).click());
        expect(new URLSearchParams(path).has('book')).toBe(false);
        expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('offset=120');
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});

test('selecting a scan retains page two of a shared book contact sheet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok:true, json:async () => ({total:120, entries:[{id:'GB-Lbl_A19_045_1'}]})});
    vi.stubGlobal('fetch', fetchMock);
    const host = document.createElement('div');
    const root = createRoot(host);
    let path = '';
    function Probe() {path = useLocation().search; return null;}
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/explore?library=GB-Lbl&book=A19&pagesPage=2']}>
            <BookBrowser metadata={null} catalogues={['GB-Lbl']}/><Probe/>
        </MemoryRouter>));
        expect(fetchMock.mock.calls[0]?.[0]).toContain('offset=60');
        await act(async () => (host.querySelector('.book-thumbnail') as HTMLButtonElement).click());
        expect(new URLSearchParams(path).get('pagesPage')).toBe('2');
        expect(new URLSearchParams(path).get('page')).toBe('GB-Lbl_A19_045_1');
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});

test('paging the books column keeps the selected book and scan', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true, json:async () => ({total:212, entries:[{id:'A19',count:120}]})}));
    const host = document.createElement('div');
    const root = createRoot(host);
    let path = '';
    function Probe() {path = useLocation().search; return null;}
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/?library=GB-Lbl&book=A19&page=GB-Lbl_A19_045_1&pagesPage=2']}>
            <BookBrowser panel="books" metadata={null} catalogues={['GB-Lbl']}/><Probe/>
        </MemoryRouter>));
        const next = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Next')!;
        await act(async () => next.click());
        const params = new URLSearchParams(path);
        expect(params.get('booksPage')).toBe('2');
        expect(params.get('book')).toBe('A19');
        expect(params.get('pagesPage')).toBe('2');
        expect(params.get('page')).toBe('GB-Lbl_A19_045_1');
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});
