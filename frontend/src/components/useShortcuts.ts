import {useEffect, useRef} from 'react';

export type Shortcut =
    | 'up' | 'down' | 'left' | 'right' | 'shiftLeft' | 'shiftRight' | 'random' | 'enter' | 'shiftEnter';

export type ShortcutHandlers = Partial<Record<Shortcut, () => void>>;

const TEXT_INPUTS = new Set(['text', 'search', 'url', 'email', 'password', 'number', 'tel']);

/** Controls where every shortcut key already has a native meaning. */
function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
        const type = (target as HTMLInputElement).type;
        return TEXT_INPUTS.has(type) || type === 'radio' || type === 'file';
    }
    return false;
}

/** Controls that Enter activates natively (buttons, links, checkboxes), so Enter must be left to them. */
function activatesOnEnter(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'BUTTON' || tag === 'A' || tag === 'INPUT';
}

function shortcutFor(event: KeyboardEvent): Shortcut | null {
    switch (event.key) {
        case 'ArrowUp': return 'up';
        case 'ArrowDown': return 'down';
        case 'ArrowLeft': return event.shiftKey ? 'shiftLeft' : 'left';
        case 'ArrowRight': return event.shiftKey ? 'shiftRight' : 'right';
        case '\\': return 'random';
        case 'Enter': return event.shiftKey ? 'shiftEnter' : 'enter';
        default: return null;
    }
}

/**
 * Global keyboard shortcuts for the search page. Events that originate in form
 * controls, links or editable content are left alone so typing and native
 * control behaviour are never intercepted.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
    const latest = useRef(handlers);
    latest.current = handlers;

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
            if (isEditable(event.target)) return;
            const shortcut = shortcutFor(event);
            if (!shortcut) return;
            if ((shortcut === 'enter' || shortcut === 'shiftEnter') && activatesOnEnter(event.target)) return;
            const handler = latest.current[shortcut];
            if (!handler) return;
            event.preventDefault();
            handler();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);
}
