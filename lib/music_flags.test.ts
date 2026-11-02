import test from 'node:test';
import assert from 'node:assert/strict';
import {notMusicFlag, refreshMusicFlag} from './music_flags.js';

test('music rescue overrides a legacy negative', () => {
    assert.equal(notMusicFlag({hasmusic: true, notmusic: true}), false);
});
test('negative decision overrides a legacy positive', () => {
    assert.equal(notMusicFlag({hasmusic: false, notmusic: false}), true);
});
test('unclassified pages retain their legacy flag', () => {
    assert.equal(notMusicFlag({notmusic: true}), true);
    assert.equal(notMusicFlag({}), undefined);
});
test('cached features receive a rescued music flag', () => {
    assert.deepEqual(refreshMusicFlag({notmusic: true, notes: 'c d'}, {notmusic: false}), {notmusic: false, notes: 'c d'});
});
test('cached features receive a negative flag', () => {
    assert.deepEqual(refreshMusicFlag({notes: 'c d'}, {notmusic: true}), {notmusic: true, notes: 'c d'});
});
