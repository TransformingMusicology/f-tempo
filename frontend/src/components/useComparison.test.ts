// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vitest';
import {useComparison} from './useComparison';

it('provides passage comparison without search-filter evidence and follows the comparison length', () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    let comparison: ReturnType<typeof useComparison> | undefined;
    function Probe({n}: {n: number}) {
        comparison = useComparison('abcDEFghi', 'abcDEFghi', n);
        return null;
    }
    act(() => root.render(createElement(Probe, {n: 5})));
    expect(comparison!.evidence?.score).toBe(1);
    expect(comparison!.queryRanges).toEqual([[0, 9]]);
    act(() => root.render(createElement(Probe, {n: 3})));
    expect(comparison!.evidence?.n).toBe(3);
    act(() => comparison!.onHoverQuery(2));
    expect(comparison!.matchRanges).toEqual([[2, 5]]);
    act(() => root.unmount());
});
