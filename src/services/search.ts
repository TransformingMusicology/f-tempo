

const baseUrl = "http://localhost:8983/solr/ftempo/select?";

function quote(str: string) {
    return `"${str}"`;
}

async function doSolrSearch(args: { [key: string]: string; }) {
    const params = new URLSearchParams(args)
    const res = await fetch(baseUrl + params);

    if (!res.ok) {
        throw new Error('Failed to fetch data')
    }
    return await res.json();
}

export async function getLibraries() {
    const result = await doSolrSearch({
        q: '*:*',
        start: '0',
        rows: '0',
        facet: 'true',
        'facet.field': 'library'
    })
    const libraries = result.facet_counts.facet_fields.library;
    return libraries.reduce(function(result: any, value: any, index: number, array: any) {
        if (index % 2 === 0)
            result.push(array.slice(index, index + 2));
        return result;
    }, []);
}

export async function getBooksForLibrary(library: string) {
    // TODO: This only gets 10 items - offset/count?
    // TODO: Only get some fields
    const result = await doSolrSearch({
        q: `library:${quote(library)}`,
    })
    return result.response.docs;
}

export async function getBook(bookId: string) {
    // TODO: This only gets 10 items - offset/count?
    // TODO: Only get some fields
    const result = await doSolrSearch({
        q: `id:${quote(bookId)}`,
    })
    const books = result.response.docs;
    if (books.length > 0) {
        return books[0];
    } else {
        return null;
    }
}

export async function queryBook(queryString: string) {
    const result = await doSolrSearch({
        q: queryString,
        defType: 'dismax'
    })
    return result.response.docs;
}

export async function getNames(library?: string) {
    const q = library ? `library:${quote(library)}` : "*:*";
    const result = await doSolrSearch({
        q,
        rows: '0',
        facet: 'true',
        'facet.field': 'names'
    })
    const names = result.facet_counts.facet_fields.names;
    return names.reduce(function(result: any, value: any, index: number, array: any) {
        if (index % 2 === 0)
            result.push(array.slice(index, index + 2));
        return result;
    }, []);
}

export async function getBooksForPerson(person: string) {
    const result = await doSolrSearch({
        q: `names:${quote(person)}`,
    })
    return result.response.docs;
}
