export type CurrentPageData = {
    library: string
    book_id: string
    page_id: string
}

export class ApiError extends Error {

}

export default class ApiClient {
    constructor() {
        console.log('api client constructor');
    }

    async getLibraries(): Promise<string[]> {
        return await fetch("/api/metadata/get_libraries").then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

    async getNames(): Promise<string[]> {
        return await fetch("/api/metadata/get_names").then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

    async getBooksForPerson(person: string): Promise<string[]> {
        const params = new URLSearchParams({person});
        return await fetch(`/api/metadata/books?${params}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

    async getBook(bookId: string): Promise<any> {
        const params = new URLSearchParams({book: bookId});
        return await fetch(`/api/metadata/book?${params}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

    async searchBook(query: string): Promise<any> {
        const params = new URLSearchParams({query});
        return await fetch(`/api/metadata/search?${params}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

    async changeBook(direction: 'next'|'prev', library: string, book: string): Promise<CurrentPageData> {
        return await fetch(`/api/next_id?direction=${direction}&library=${library}&book=${book}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }
        ).then(response => {
            return {library: response.data.library, book_id: response.data.book_id, page_id: response.data.page.id};
        });
    }

    async changePage(direction: 'next'|'prev', library: string, book: string, page_id: string): Promise<CurrentPageData> {
        return await fetch(`/api/next_id?direction=${direction}&library=${library}&book=${book}&page=${page_id}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }
        ).then(response => {
            return {library: response.data.library, book_id: response.data.book_id, page_id: response.data.page.id};
        });
    }

    async randomPage(): Promise<CurrentPageData> {
        return fetch(`/api/random_id`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }
        ).then(response => {
            return {library: response.library, book_id: response.book, page_id: response.id};
        });
    }

    async metadata(documentId: string): Promise<CurrentPageData> {
        return fetch(`/api/metadata?id=${documentId}`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(response => {
            return {library: response.library, book_id: response.book, page_id: response.siglum};
        });
    }

    async catalogues(): Promise<any> {
        return fetch(`/api/catalogues`).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(response => {
            return response.data;
        });
    }

    async query(query: any): Promise<any> {
        return fetch("/api/query", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        }).then(r => {
            if (r.status === 200) {
                return r.json();
            } else {
                throw new ApiError();
            }
        }).then(data => {
            return data;
        });
    }

}