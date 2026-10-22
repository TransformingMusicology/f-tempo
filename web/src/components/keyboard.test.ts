import {describe, expect, it} from 'vitest';
import {dispatchShortcut, shouldIgnoreKeyEvent} from './keyboard';

function event(init: Partial<KeyboardEventInit> & {target?: EventTarget}) {
    const e = new KeyboardEvent('keydown', init);
    if (init.target) Object.defineProperty(e, 'target', {value: init.target});
    return e;
}

describe('shouldIgnoreKeyEvent', () => {
    it('ignores keys typed into fields and controls', () => {
        for (const tag of ['input', 'textarea', 'select', 'button']) {
            expect(shouldIgnoreKeyEvent(event({target: document.createElement(tag)}))).toBe(true);
        }
        const editable = document.createElement('div');
        Object.defineProperty(editable, 'isContentEditable', {value: true});
        expect(shouldIgnoreKeyEvent(event({target: editable}))).toBe(true);
    });
    it('ignores modified keys', () => {
        expect(shouldIgnoreKeyEvent(event({target: document.body, metaKey: true}))).toBe(true);
        expect(shouldIgnoreKeyEvent(event({target: document.body, ctrlKey: true}))).toBe(true);
    });
    it('accepts plain keys on the page', () => {
        expect(shouldIgnoreKeyEvent(event({target: document.body}))).toBe(false);
        expect(shouldIgnoreKeyEvent(event({target: document.createElement('tr')}))).toBe(false);
    });
});

describe('dispatchShortcut', () => {
    it('maps arrows, shift-arrows, backslash, enter and escape', () => {
        const calls: string[] = [];
        const handlers = {
            moveSelection: (d: number) => calls.push(`move${d}`),
            changePage: (d: string) => calls.push(`page-${d}`),
            changeBook: (d: string) => calls.push(`book-${d}`),
            randomPage: () => calls.push('random'),
            searchSelected: () => calls.push('search'),
            clearSelection: () => calls.push('clear'),
        };
        for (const [key, shiftKey] of [['ArrowDown', false], ['ArrowUp', false], ['ArrowRight', false], ['ArrowLeft', true], ['\\', false], ['Enter', false], ['Escape', false]] as const) {
            dispatchShortcut(event({key, shiftKey}), handlers)?.();
        }
        expect(calls).toEqual(['move1', 'move-1', 'page-next', 'book-prev', 'random', 'search', 'clear']);
        expect(dispatchShortcut(event({key: 'x'}), handlers)).toBeUndefined();
        expect(dispatchShortcut(event({key: 'ArrowLeft'}), {})).toBeUndefined();
    });
});
