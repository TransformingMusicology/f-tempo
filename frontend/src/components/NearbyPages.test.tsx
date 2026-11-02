// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, test, vi} from 'vitest';
import NearbyPages from './NearbyPages';
vi.mock('./PagePane', () => ({default: ({heading, actions}: any) => <div>{heading}{actions}</div>}));

test('previewing a neighbour leaves the search unchanged until explicitly requested', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true, json:async () => ({nearby:[{id:'GB-Lbl_A19_002_0'}]})}));
    const host = document.createElement('div');
    const root = createRoot(host);
    const search = vi.fn();
    try {
        await act(async () => root.render(<NearbyPages id="GB-Lbl_A19_001_1" library="GB-Lbl" book="A19" onSearch={search}/>));
        await act(async () => host.querySelector('button')!.click());
        await act(async () => (host.querySelector('.book-thumbnail') as HTMLButtonElement).click());
        expect(host.textContent).toContain('Preview: GB-Lbl_A19_002_0');
        expect(search).not.toHaveBeenCalled();
        await act(async () => Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Search this page')!.click());
        expect(search).toHaveBeenCalledWith('GB-Lbl_A19_002_0');
    } finally {act(() => root.unmount()); vi.unstubAllGlobals();}
});
