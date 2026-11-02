// @vitest-environment jsdom
import {expect, test, vi, beforeEach} from 'vitest';
import {idSearchLoader} from './SearchPage';
import {RouterContextProvider} from 'react-router';
import {getMetadata, getCodestring, runSearch} from '../api';
vi.mock('../api', async importOriginal => ({...await importOriginal<typeof import('../api')>(),
    getMetadata: vi.fn(), getCodestring: vi.fn(), runSearch: vi.fn()}));
vi.mock('../util/lastSearch', () => ({rememberSearch: vi.fn(), lastSearch: vi.fn()}));
beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMetadata).mockResolvedValue({siglum:'cpdl_Lasso_abc_part2', library:'cpdl', book:'Lasso', part_number:'2'});
    vi.mocked(getCodestring).mockResolvedValue('abc');
    vi.mocked(runSearch).mockResolvedValue({numQueryWords:1, numResults:0, results:[]});
});
test('score URL searches the selected indexed voice', async () => {
    const url = new URL('http://localhost/?q=cpdl_Lasso_abc&part=2');
    const data = await idSearchLoader({request:new Request(url),url,pattern:'/',params:{},context:new RouterContextProvider()});
    expect(getMetadata).toHaveBeenCalledWith('cpdl_Lasso_abc_part2');
    expect(runSearch).toHaveBeenCalledWith(expect.objectContaining({id:'cpdl_Lasso_abc_part2'}));
    expect(data.displayedId).toBe('cpdl_Lasso_abc');
    expect(data.query).toBe('cpdl_Lasso_abc_part2');
});
test('browsing a selected voice does not search', async () => {
    const url = new URL('http://localhost/explore?page=cpdl_Lasso_abc&part=2');
    await idSearchLoader({request:new Request(url),url,pattern:'/explore',params:{},context:new RouterContextProvider()});
    expect(runSearch).not.toHaveBeenCalled();
});

test('Browse displays the saved scan without searching the retained query', async () => {
    const url = new URL('http://localhost/explore?view=browse&q=cpdl_Lasso_abc&part=2&page=GB-Lbl_A19_002_0&library=GB-Lbl&book=A19&pagesPage=2&sel=match');
    const data = await idSearchLoader({request:new Request(url),url,pattern:'/explore',params:{},context:new RouterContextProvider()});
    expect(getMetadata).toHaveBeenCalledWith('GB-Lbl_A19_002_0');
    expect(data.displayedId).toBe('GB-Lbl_A19_002_0');
    expect(data.query).toBeNull();
    expect(runSearch).not.toHaveBeenCalled();
});

test('Results uses the retained query rather than the newly browsed page', async () => {
    const url = new URL('http://localhost/explore?view=results&q=cpdl_Lasso_abc&part=2&page=GB-Lbl_A19_002_0&library=GB-Lbl&book=A19&pagesPage=2&sel=match');
    const data = await idSearchLoader({request:new Request(url),url,pattern:'/explore',params:{},context:new RouterContextProvider()});
    expect(data.displayedId).toBe('cpdl_Lasso_abc');
    expect(runSearch).toHaveBeenCalledWith(expect.objectContaining({id:'cpdl_Lasso_abc_part2'}));
});
