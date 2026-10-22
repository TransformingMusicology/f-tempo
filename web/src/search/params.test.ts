import {describe, expect, it} from 'vitest';
import {codeUrl, pageUrl, parseSearchOptions, searchUrl, serialiseSearchOptions} from './params';

const catalogues = ['D-Mbs', 'GB-Lbl', 'F-Pn'];

describe('parseSearchOptions', () => {
    it('returns defaults for an empty query string', () => {
        const {options, notices} = parseSearchOptions(new URLSearchParams(), catalogues);
        expect(options).toEqual({representation: 'maw', ranking: 'jaccard', numResults: 10, collections: []});
        expect(notices).toEqual([]);
    });

    it('reads valid values', () => {
        const {options, notices} = parseSearchOptions(new URLSearchParams('rep=5gram&rank=solr&n=25&c=GB-Lbl,F-Pn'), catalogues);
        expect(options).toEqual({representation: '5gram', ranking: 'solr', numResults: 25, collections: ['GB-Lbl', 'F-Pn']});
        expect(notices).toEqual([]);
    });

    it('rejects a ranking that does not belong to the representation', () => {
        const {options, notices} = parseSearchOptions(new URLSearchParams('rep=5gram&rank=boolean'), catalogues);
        expect(options.ranking).toBe('cosine');
        expect(notices).toHaveLength(1);
    });

    it('drops unknown collections and treats "all" as none', () => {
        const unknown = parseSearchOptions(new URLSearchParams('c=GB-Lbl,PL-Kj'), catalogues);
        expect(unknown.options.collections).toEqual(['GB-Lbl']);
        expect(unknown.notices[0]).toMatch(/PL-Kj/);
        const all = parseSearchOptions(new URLSearchParams('c=D-Mbs,GB-Lbl,F-Pn'), catalogues);
        expect(all.options.collections).toEqual([]);
    });

    it('replaces an invalid result count', () => {
        const {options, notices} = parseSearchOptions(new URLSearchParams('n=7'), catalogues);
        expect(options.numResults).toBe(10);
        expect(notices).toHaveLength(1);
    });
});

describe('serialiseSearchOptions', () => {
    it('omits defaults and round-trips', () => {
        expect(serialiseSearchOptions({representation: 'maw', ranking: 'jaccard', numResults: 10, collections: []}).toString()).toBe('');
        const options = {representation: '5gram' as const, ranking: 'jaccard' as const, numResults: 30, collections: ['D-Mbs']};
        const params = serialiseSearchOptions(options);
        expect(parseSearchOptions(params, catalogues).options).toEqual(options);
    });

    it('builds page and code URLs with a selection hash', () => {
        const options = {representation: 'maw' as const, ranking: 'solr' as const, numResults: 10, collections: []};
        expect(pageUrl('GB-Lbl_A1_001_0', options)).toBe('/page/GB-Lbl_A1_001_0?rank=solr');
        expect(searchUrl('GB-Lbl_A1_001_0', options, 'GB-Lbl_A1_002_0')).toBe('/search/GB-Lbl_A1_001_0?rank=solr#GB-Lbl_A1_002_0');
        expect(codeUrl('aBc', options)).toBe('/code?rank=solr&cs=aBc');
    });
});
