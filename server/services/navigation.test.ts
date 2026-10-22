import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {next_id, NextIdNotFound, type CollectionIndex} from './navigation.ts';

function page(id: string) {
    return {id, page: id, jpg: `${id}.jpg`, mei: `${id}.mei`};
}

const db: CollectionIndex = {
    'GB-Lbl': {
        book_ids: ['A1', 'A2'],
        books: {
            A1: {page_ids: ['A1_1', 'A1_2'], pages: {A1_1: page('A1_1'), A1_2: page('A1_2')}},
            A2: {page_ids: ['A2_1'], pages: {A2_1: page('A2_1')}},
        },
    },
};

describe('next_id', () => {
    it('moves to the next and previous page within a book', () => {
        assert.equal(next_id(db, 'GB-Lbl', 'A1', 'A1_1', 'next').page.id, 'A1_2');
        assert.equal(next_id(db, 'GB-Lbl', 'A1', 'A1_2', 'prev').page.id, 'A1_1');
    });
    it('stays on the same page at the ends of a book', () => {
        assert.equal(next_id(db, 'GB-Lbl', 'A1', 'A1_2', 'next').page.id, 'A1_2');
        assert.equal(next_id(db, 'GB-Lbl', 'A1', 'A1_1', 'prev').page.id, 'A1_1');
    });
    it('moves to the first page of the next and previous book', () => {
        const next = next_id(db, 'GB-Lbl', 'A1', undefined, 'next');
        assert.deepEqual([next.book_id, next.page.id], ['A2', 'A2_1']);
        const prev = next_id(db, 'GB-Lbl', 'A2', undefined, 'prev');
        assert.deepEqual([prev.book_id, prev.page.id], ['A1', 'A1_1']);
    });
    it('stays on the same book at the ends of a library', () => {
        assert.equal(next_id(db, 'GB-Lbl', 'A2', undefined, 'next').book_id, 'A2');
        assert.equal(next_id(db, 'GB-Lbl', 'A1', undefined, 'prev').book_id, 'A1');
    });
    it('rejects unknown libraries, books and pages', () => {
        assert.throws(() => next_id(db, 'X', 'A1', undefined, 'next'), NextIdNotFound);
        assert.throws(() => next_id(db, 'GB-Lbl', 'Z', undefined, 'next'), NextIdNotFound);
        assert.throws(() => next_id(db, 'GB-Lbl', 'A1', 'nope', 'next'), NextIdNotFound);
    });
});
