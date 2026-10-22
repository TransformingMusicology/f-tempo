import {useState, type KeyboardEvent} from 'react';
import {Button} from 'react-bootstrap';
import {titlePageUrl} from '../config';

type Props = {
    /** The stored title-page URL from the index; the button is not rendered without one. */
    titlepage?: string;
    label: string;
};

/**
 * Press-and-hold control that shows a book's title page while held.
 * Returns the button and whether the title page is currently shown.
 */
export function useTitlePageHold() {
    const [held, setHeld] = useState(false);
    return {held, setHeld};
}

export function TitlePageButton({titlepage, label, setHeld}: Props & {setHeld: (held: boolean) => void}) {
    if (!titlepage) return null;
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            setHeld(true);
        }
    };
    const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === ' ' || event.key === 'Enter') setHeld(false);
    };
    return (
        <Button
            variant="outline-secondary"
            size="sm"
            className="title-page-button"
            title={`Hold to see the title page of this book (${label})`}
            aria-label={`Hold to see the title page of this book (${label})`}
            onPointerDown={() => setHeld(true)}
            onPointerUp={() => setHeld(false)}
            onPointerLeave={() => setHeld(false)}
            onPointerCancel={() => setHeld(false)}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onBlur={() => setHeld(false)}
            onContextMenu={event => event.preventDefault()}
        >
            <img src="/tp_book.svg" alt="" height={16} />
        </Button>
    );
}

export function TitlePageImage({titlepage, label}: Props) {
    if (!titlepage) return null;
    return (
        <div className="scan title-page">
            <img src={titlePageUrl(titlepage)} alt={`Title page of the book containing ${label}`} />
        </div>
    );
}
