import {expect, test} from 'vitest';
import {setScoreTarget} from './scoreUrl';
test('legacy voice IDs become score URLs with the selected voice', () => {
    const params = new URLSearchParams();
    setScoreTarget(params, 'q', 'cpdl_Lasso_abc_part2');
    expect(params.toString()).toBe('q=cpdl_Lasso_abc&part=2');
});
test('searching a scan clears any previously selected voice', () => {
    const params = new URLSearchParams('part=2');
    setScoreTarget(params, 'page', 'GB-Lbl_A19_001_1');
    expect(params.toString()).toBe('page=GB-Lbl_A19_001_1');
});
