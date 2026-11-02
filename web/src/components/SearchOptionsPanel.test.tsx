import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useState} from 'react';
import SearchOptionsPanel from './SearchOptionsPanel';
import {defaultOptions, searchUrl, type SearchOptions} from '../search/params';

afterEach(cleanup);

function Harness({onSearch}: {onSearch: (options: SearchOptions) => void}) {
    const [options, setOptions] = useState(defaultOptions());
    return <SearchOptionsPanel options={options} catalogues={['GB-Lbl', 'D-Mbs']} onChange={setOptions}
        onSearch={() => onSearch(options)} searchLabel="Search" disabled={false} />;
}

it('edits options without searching, then submits them together', () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    fireEvent.click(screen.getByLabelText('Filter scattered matches'));
    expect(screen.getByLabelText('Minimum continuity (%)')).toHaveValue(25);
    fireEvent.change(screen.getByLabelText('Minimum continuity (%)'), {target: {value: '42.5'}});
    fireEvent.change(screen.getByLabelText('Search type'), {target: {value: '5gram'}});
    fireEvent.change(screen.getByLabelText('Results to display'), {target: {value: '20'}});
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', {name: 'Apply'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Search'}));
    expect(onSearch).toHaveBeenCalledOnce();
    const options = onSearch.mock.calls[0][0];
    expect(options).toMatchObject({continuity: true, continuityMinimum: 42.5, representation: '5gram', numResults: 20});
    expect(searchUrl('query', options)).toContain('minContinuity=42.5');
});

it('does not apply a threshold outside the supported range', () => {
    render(<Harness onSearch={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Filter scattered matches'));
    fireEvent.change(screen.getByLabelText('Minimum continuity (%)'), {target: {value: '101'}});
    expect(screen.getByRole('button', {name: 'Search'})).toBeDisabled();
});

it('submitting the form applies the edited threshold', () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    fireEvent.click(screen.getByLabelText('Filter scattered matches'));
    const input = screen.getByLabelText('Minimum continuity (%)');
    fireEvent.change(input, {target: {value: '0'}});
    fireEvent.submit(input.closest('form')!);
    expect(onSearch.mock.calls[0][0].continuityMinimum).toBe(0);
});
