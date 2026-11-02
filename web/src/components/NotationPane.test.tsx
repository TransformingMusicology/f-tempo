import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import NotationPane from './NotationPane';

vi.mock('../api/client', () => ({getMei: async () => `<mei xmlns="http://www.music-encoding.org/ns/mei"><music><body><mdiv><score><section><staff><layer>${['c','d','e','f','g'].map((p, i) => `<note xml:id="n${i}" pname="${p}" oct="4" dur="4"/>`).join('')}</layer></staff></section></score></mdiv></body></music></mei>`}));
vi.mock('verovio/wasm', () => ({default: async () => ({})}));
vi.mock('verovio/esm', () => ({VerovioToolkit: class {
    setOptions() {} loadData() { return true; } getPageCount() { return 1; } destroy() {}
    renderToSVG() { return `<svg xmlns="http://www.w3.org/2000/svg">${[0,1,2,3,4].map(i => `<g class="note" id="n${i}"><path d="M0 0h1"/></g>`).join('')}</svg>`; }
}}));
afterEach(cleanup);

it('highlights n+1 notes and makes matching starts selectable by hover and focus', async () => {
    const onSelect = vi.fn();
    const {container} = render(<NotationPane pageId="page" label="Query" codestring="AAAA" n={3}
        commonStarts={[1]} selectedStarts={[1]} onSelect={onSelect} />);
    const start = await screen.findByRole('button', {name: 'Query matching fragment at note 2'});
    await waitFor(() => expect(container.querySelector('#n4')).toHaveStyle({color: '#b45b00'}));
    expect(container.querySelector('#n0')).toHaveStyle({color: '#16736b'});
    fireEvent.pointerOver(start.querySelector('path')!);
    expect(onSelect).toHaveBeenLastCalledWith(1);
    fireEvent.focus(start);
    expect(onSelect).toHaveBeenCalledTimes(2);
    fireEvent.pointerOver(container.querySelector('#n4')!);
    expect(onSelect).toHaveBeenCalledTimes(2);
});

it('does not enable misleading highlights when the indexed pitches differ', async () => {
    render(<NotationPane pageId="other" label="Result" codestring="AAAB" n={3}
        commonStarts={[1]} selectedStarts={[1]} onSelect={vi.fn()} />);
    expect(await screen.findByText(/notes differ from the indexed sequence/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
