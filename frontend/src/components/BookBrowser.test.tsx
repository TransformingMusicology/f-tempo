// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router';
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
        expect(params.has('q')).toBe(false);
        expect(params.has('sel')).toBe(false);
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});
