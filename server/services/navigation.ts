/**
 * Previous/next page and book navigation over the loaded collection index.
 * Pure functions over the index JSON structure so they can be tested without Solr.
 */

export type IndexPage = {id: string; page: string; jpg: string; mei: string};
export type IndexBook = {page_ids: string[]; pages: Record<string, IndexPage>};
export type IndexLibrary = {
    book_ids: string[];
    books: Record<string, IndexBook>;
    directory_per_book?: boolean;
};
export type CollectionIndex = Record<string, IndexLibrary>;

export type NextIdResponse = {library: string; book_id: string; page: IndexPage};

export class NextIdNotFound extends Error {
    public status: number;
    constructor(message: string) {
        super(message);
        this.status = 404;
    }
}

function clamp(position: number, length: number) {
    return Math.min(Math.max(position, 0), length - 1);
}

/**
 * Find the previous/next page in a book, or (when `page_id` is not given) the first page of the
 * previous/next book in the library. At the first or last position the same page is returned.
 */
export function next_id(db: CollectionIndex, library: string, book_id: string, page_id: string | null | undefined,
                        direction: 'prev' | 'next'): NextIdResponse {
    const db_library = db[library];
    if (!db_library) {
        throw new NextIdNotFound(`Library ${library} not found`);
    }
    if (!db_library.book_ids.includes(book_id)) {
        throw new NextIdNotFound(`Book ${book_id} not found in library ${library}`);
    }
    const step = direction === 'prev' ? -1 : 1;

    if (page_id) {
        const book = db_library.books[book_id];
        const page_position = book.page_ids.indexOf(page_id);
        if (page_position === -1) {
            throw new NextIdNotFound(`Page ${page_id} not found in book ${book_id}`);
        }
        const new_page_id = book.page_ids[clamp(page_position + step, book.page_ids.length)];
        return {library, book_id, page: book.pages[new_page_id]};
    }

    const book_position = db_library.book_ids.indexOf(book_id);
    const new_book_id = db_library.book_ids[clamp(book_position + step, db_library.book_ids.length)];
    const new_book = db_library.books[new_book_id];
    return {library, book_id: new_book_id, page: new_book.pages[new_book.page_ids[0]]};
}
