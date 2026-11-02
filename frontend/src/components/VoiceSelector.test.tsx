// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router';
import {expect, test} from 'vitest';
import VoiceSelector from './VoiceSelector';

test('changing a query voice stays in search mode despite a previous scan browse location', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    let path = '';
    function Probe() {path = useLocation().search; return null;}
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={['/?q=cpdl_Lasso_abc&part=1&page=GB-Lbl_A19_001_1&library=GB-Lbl&book=A19&sel=old']}>
            <VoiceSelector metadata={{siglum:'cpdl_Lasso_abc_part1',library:'cpdl',book:'Lasso',parts:[
                {id:'cpdl_Lasso_abc_part1',part_number:'1',part_name:'Soprano'},
                {id:'cpdl_Lasso_abc_part2',part_number:'2',part_name:'Alto'},
            ]}}/><Probe/>
        </MemoryRouter>));
        await act(async () => {
            const select = host.querySelector('select')!;
            select.value = 'cpdl_Lasso_abc_part2';
            select.dispatchEvent(new Event('change', {bubbles:true}));
        });
        const params = new URLSearchParams(path);
        expect(params.get('view')).toBe('results');
        expect(params.get('page')).toBe('cpdl_Lasso_abc_part2');
        expect(params.has('q')).toBe(false);
        expect(params.has('sel')).toBe(false);
        expect(params.has('part')).toBe(false);
    } finally {act(() => root.unmount());}
});
