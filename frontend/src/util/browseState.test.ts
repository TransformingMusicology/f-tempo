import {expect, test} from 'vitest';
import {isBrowsing} from './browseState';

test('the main entry point defaults to search, including page links', () => {
    expect(isBrowsing(new URLSearchParams())).toBe(false);
    expect(isBrowsing(new URLSearchParams('page=GB-Lbl_A19_001_1'))).toBe(false);
});

test('explicit Browse links still open browsing', () => {
    expect(isBrowsing(new URLSearchParams('view=browse&page=GB-Lbl_A19_001_1'))).toBe(true);
});

test('Explore retains its browse default', () => {
    expect(isBrowsing(new URLSearchParams(), '/explore')).toBe(true);
    expect(isBrowsing(new URLSearchParams('q=page'), '/explore')).toBe(false);
});
