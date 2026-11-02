import {expect, it} from 'vitest';
import {continuityHover} from './continuityHover';

const evidence = {status: 'ok' as const, n: 5, score: 0.5, coveredIntervals: 10,
    passages: [{queryStart: 10, matchStart: 30, length: 10}]};

it('maps the cursor to corresponding n-grams on both scores', () => {
    expect(continuityHover(evidence, 12)).toEqual({query: [[12, 17]], match: [[32, 37]]});
});

it('keeps the last n-gram inside the scored passage', () => {
    expect(continuityHover(evidence, 19)).toEqual({query: [[15, 20]], match: [[35, 40]]});
});

it('clears highlights in gaps and at the exclusive end', () => {
    expect(continuityHover(evidence, 9)).toEqual({query: [], match: []});
    expect(continuityHover(evidence, 20)).toEqual({query: [], match: []});
});
