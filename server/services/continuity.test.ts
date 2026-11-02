import assert from 'node:assert/strict';
import {test} from 'node:test';
import {continuity} from '../../lib/continuity.js';
import {filterContinuity as rerankContinuity} from './continuity.js';

test('includes an exact n-gram at the final position', () => {
    const result = continuity('ABCDE', 'xxxABCDE');
    assert.equal(result.score, 1);
    assert.deepEqual(result.passages, [{queryStart: 0, matchStart: 3, length: 5}]);
});

test('overlapping anchors count each interval once', () => {
    const result = continuity('ABCDEFGHIJK', 'ABCDEFGHIJK');
    assert.equal(result.coveredIntervals, 11);
    assert.equal(result.queryCoverage, 1);
    assert.equal(result.score, 1);
});

test('a short OMR insertion preserves the chain with a penalty', () => {
    const result = continuity('ABCDEFGHIJKLMNO', 'ABCDEFGxHIJKLMNO');
    assert.equal(result.coveredIntervals, 15);
    assert.equal(result.passages.length, 2);
    assert.equal(result.score, 14.5 / 15);
});

test('reordered shared passages rank below a coherent sequence', () => {
    const query = 'ABCDEFGHIJKLMNO';
    assert.ok(continuity(query, 'KLMNOFGHIJABCDE').score < continuity(query, query).score);
});

test('large gaps do not join distant fragments into a strong passage', () => {
    assert.equal(continuity('ABCDEFGHIJ', 'ABCDE' + 'x'.repeat(100) + 'FGHIJ').coveredIntervals, 5);
});

test('repetition selects a coherent occurrence without counting it twice', () => {
    const result = continuity('ABCDEABCDE', 'ABCDEABCDEABCDE');
    assert.equal(result.coveredIntervals, 10);
    assert.equal(result.queryCoverage, 1);
    assert.equal(result.matchCoverage, 2 / 3);
    assert.equal(result.score, 1);
});

test('short and unrelated sequences have no evidence', () => {
    assert.equal(continuity('AB', 'AB').score, 0);
    assert.equal(continuity('ABCDE', 'xxxxx').coveredIntervals, 0);
    assert.equal(continuity('', '').score, 0);
});

test('longer anchors can lose evidence around an OMR error', () => {
    assert.ok(continuity('ABCDEFGHIJ', 'ABCDxFGHIJ', 3).score > continuity('ABCDEFGHIJ', 'ABCDxFGHIJ', 6).score);
});

test('spaces are not musical intervals and coverage is directional', () => {
    const result = continuity(' A B C D E ', 'xxxxxABCDEyyyyy');
    assert.equal(result.score, 1);
    assert.equal(result.queryCoverage, 1);
    assert.equal(result.matchCoverage, 1 / 3);
});

test('oversize input is explicitly unscored', () => {
    assert.equal(continuity('A'.repeat(2000), 'A'.repeat(2000)).status, 'too-large');
});

test('threshold filters the pool before truncation and retains equality', () => {
    const result = rerankContinuity('ABCDEFGHIJ', [
        {codestring: 'xxxxx', id: 'negative'},
        {codestring: 'ABCDEyyyyy', id: 'partial'},
        {codestring: 'ABCDEFGHIJ', id: 'exact'},
    ], 2, 50);
    assert.deepEqual(result.results.map(r => r.id), ['partial', 'exact']);
    assert.equal(result.continuityFiltered, 1);
    assert.equal(result.numResults, 2);
});

test('zero threshold preserves zero-score candidates and stable ties', () => {
    const result = rerankContinuity('ABCDE', [{codestring: 'xxxxx', id: 'a'}, {codestring: 'yyyyy', id: 'b'}], 2);
    assert.deepEqual(result.results.map(r => r.id), ['a', 'b']);
});

test('all candidates can be hidden with an explicit filtered count', () => {
    const result = rerankContinuity('ABCDE', [{codestring: 'xxxxx'}], 10, 1);
    assert.equal(result.numResults, 0);
    assert.equal(result.continuityFiltered, 1);
});

test('unscored candidates retain original order and bypass the threshold explicitly', () => {
    const candidates = [{codestring: 'A'.repeat(2000)}, {codestring: 'xxxxx'}];
    const result = rerankContinuity('A'.repeat(2000), candidates, 2, 100);
    assert.equal(result.continuityApplied, false);
    assert.deepEqual(result.results, candidates);
    assert.match(result.continuityNotice!, /not applied/);
});

test('batch computation budget preserves the original ranking', () => {
    const result = rerankContinuity('A'.repeat(1100), Array.from({length: 100}, () => ({codestring: 'A'.repeat(1100)})), 10);
    assert.equal(result.continuityApplied, false);
    assert.equal(result.results.length, 10);
});

test('invalid threshold values are rejected', () => {
    assert.throws(() => rerankContinuity('ABCDE', [], 10, NaN), RangeError);
    assert.throws(() => rerankContinuity('ABCDE', [], 10, 101), RangeError);
    assert.throws(() => rerankContinuity('ABCDE', [], 10, -1), RangeError);
});

test('appends only rejected candidates between the first and last displayed matches', () => {
    const result = rerankContinuity('ABCDEFGHIJ', [
        {id: 'before', codestring: 'xxxxx'},
        {id: 'first', codestring: 'ABCDEyyyyy'},
        {id: 'gap', codestring: 'xxxxx'},
        {id: 'last', codestring: 'ABCDEFGHIJ'},
        {id: 'after', codestring: 'xxxxx'},
        {id: 'later-pass', codestring: 'ABCDEFGHIJ'},
    ], 2, 50);
    assert.deepEqual(result.results.map(r => r.id), ['first', 'last', 'gap']);
    assert.deepEqual(result.results.map(r => 'originalRank' in r ? r.originalRank : null), [2, 4, 3]);
    assert.deepEqual(result.results.map(r => 'belowThreshold' in r ? r.belowThreshold : null), [false, false, true]);
    assert.equal(result.numResults, 2);
    assert.equal(result.continuityFiltered, 3);
});

test('one passing candidate has no intervening rejected results', () => {
    const result = rerankContinuity('ABCDE', [{codestring:'xxxxx'}, {codestring:'ABCDE'}, {codestring:'yyyyy'}], 10, 50);
    assert.equal(result.results.length, 1);
    assert.equal(result.numResults, 1);
});
