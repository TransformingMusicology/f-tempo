import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import ContinuityComparison from './ContinuityComparison';
afterEach(cleanup);

it('lets the user scan matching positions in either sequence without images', () => {
    render(<ContinuityComparison query="ABCDEFGHIJ" match="xxxABCDEFGHIJ" />);
    expect(screen.getByText('100.0%', {selector: 'strong'})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Starting interval 1'), {target: {value: '5'}});
    expect(screen.getByText('FGHIJ', {selector: 'code'})).toBeInTheDocument();
    expect(screen.getByText(/occurs at result interval:/)).toHaveTextContent('9');
    fireEvent.change(screen.getByLabelText('Scan through'), {target: {value: 'match'}});
    fireEvent.change(screen.getByLabelText('Starting interval 1'), {target: {value: '3'}});
    expect(screen.getByText(/occurs at query interval:/)).toHaveTextContent('1');
});

it('changing comparison n-gram length updates the evidence', () => {
    render(<ContinuityComparison query="ABCDE" match="ABCDE" />);
    fireEvent.change(screen.getByLabelText('N-gram length'), {target: {value: '6'}});
    expect(screen.getByText('0.0%', {selector: 'strong'})).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeDisabled();
});
