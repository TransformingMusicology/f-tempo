import {useEffect} from 'react';

export type ShortcutHandlers = {
    moveSelection?: (delta: 1 | -1) => void;
    clearSelection?: () => void;
    changePage?: (direction: 'prev' | 'next') => void;
    changeBook?: (direction: 'prev' | 'next') => void;
    randomPage?: () => void;
    searchSelected?: () => void;
    toggleOverlay?: () => void;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

/** True when a key event belongs to a control the user is operating, so shortcuts must not fire. */
export function shouldIgnoreKeyEvent(event: Pick<KeyboardEvent, 'target' | 'ctrlKey' | 'metaKey' | 'altKey'>): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return EDITABLE_TAGS.has(target.tagName);
}

/** Map a key event to the handler it triggers, or undefined. */
export function dispatchShortcut(event: KeyboardEvent, handlers: ShortcutHandlers): (() => void) | undefined {
    switch (event.key) {
        case 'ArrowUp': return handlers.moveSelection && (() => handlers.moveSelection!(-1));
        case 'ArrowDown': return handlers.moveSelection && (() => handlers.moveSelection!(1));
        case 'ArrowLeft': return event.shiftKey ? handlers.changeBook && (() => handlers.changeBook!('prev')) : handlers.changePage && (() => handlers.changePage!('prev'));
        case 'ArrowRight': return event.shiftKey ? handlers.changeBook && (() => handlers.changeBook!('next')) : handlers.changePage && (() => handlers.changePage!('next'));
        case '\\': return handlers.randomPage;
        case 'Enter': return handlers.searchSelected;
        case 'Escape': return handlers.clearSelection;
        case 'o': case 'O': return handlers.toggleOverlay;
        default: return undefined;
    }
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            if (shouldIgnoreKeyEvent(event)) return;
            const action = dispatchShortcut(event, handlers);
            if (!action) return;
            event.preventDefault();
            action();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handlers]);
}
