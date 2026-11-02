import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {MemoryRouter, useLocation} from 'react-router';
import SearchOptionsPanel from './SearchOptionsPanel';
import {defaultOptions, searchUrl} from '../search/params';

afterEach(cleanup);

function Location() { return <output aria-label="Location">{useLocation().search}</output>; }
function setup() {
    render(<MemoryRouter><SearchOptionsPanel options={{...defaultOptions(), continuity: true}} catalogues={['GB-Lbl']}
        buildUrl={options => searchUrl('query', options)} onSearch={vi.fn()} searchLabel="Search" disabled={false} /><Location /></MemoryRouter>);
}

it('applies a typed threshold to the shareable URL', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Minimum continuity (%)'), {target: {value: '42.5'}});
    fireEvent.click(screen.getByRole('button', {name: 'Apply'}));
    expect(screen.getByLabelText('Location')).toHaveTextContent('continuity=1&minContinuity=42.5');
});

it('does not apply a threshold outside the supported range', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Minimum continuity (%)'), {target: {value: '101'}});
    expect(screen.getByRole('button', {name: 'Apply'})).toBeDisabled();
});

it('submitting the form applies the edited threshold', () => {
    setup();
    const input = screen.getByLabelText('Minimum continuity (%)');
    fireEvent.change(input, {target: {value: '60'}});
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByLabelText('Location')).toHaveTextContent('minContinuity=60');
});
