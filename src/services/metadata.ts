
function quote(str: string) {
    return `"${str}"`;
}

async function doSolrMetadataSearch(args: string[][] | Record<string, string>, init?: RequestInit) {
    const params = new URLSearchParams(args)
    const searchUrl = process.env.SOLR_METADATA_CORE + "select?";
    const res = await fetch(searchUrl + params);

    if (!res.ok) {
        throw new Error('Failed to fetch data')
    }
    return await res.json();
}

export type MetadataSearchPerson = {
    id: string,
    rismPersonId: string,
    name: string,
}

export type MetadataSearchBook = {
    id: string,
    library: string,
    book: string,
    rismSourceId: string,
    title: string,
    standardizedTitle: string,
    placeOfPublication: string,
    dateOfPublication: string,
    composerIds: string[],
    composerNames: string[],
    composers: MetadataSearchPerson[],
    manifestUrl: string,
    publishers: string[],
    shelfmark: string,
    catalogueRecordUrl: string
}

export type MetadataSearchResults = {
    numResults: number,
    results: MetadataSearchBook[]
}

export async function getLibraries() {
    const result = await doSolrMetadataSearch({
        q: '*:*',
        fq: 'type:book',
        start: '0',
        rows: '0',
        facet: 'true',
        'facet.field': 'library_s'
    })
    const libraries = result.facet_counts.facet_fields.library_s;
    return libraries.reduce(function(result: any, value: any, index: number, array: any) {
        if (index % 2 === 0)
            result.push(array.slice(index, index + 2));
        return result;
    }, []);
}


async function getPeople(peopleIds: string[]) {
    if (peopleIds.length == 0) {
        return {};
    }
    const fqParams = peopleIds.join(" OR ")
    const result = await doSolrMetadataSearch([
        ["q", '*:*'],
        ["fq", `id:(${fqParams})`],
        ["fq", "type:person"],
        ["rows", peopleIds.length.toString()]
    ])
    return result.response.docs.reduce((a: any, v: any) => ({ ...a, [v.id]: v}), {})
}


async function addPersonNamesToBooks(books: any[]) {
    const allComposers: string[] = books.map(bk => bk.composer_ss).filter(x => x !== undefined).reduce(
        (accumulator, currentArray) => accumulator.concat(currentArray), []
    )
    const uniqueComposers = new Set(allComposers);
    const uniqueComposersArray = Array.from(uniqueComposers);
    const solrPeople = await getPeople(uniqueComposersArray);
    return books.map(book => {
        if (book.composer_ss === undefined) {
            return book;
        }
        return {...book, people: book.composer_ss?.map((v: string) => solrPeople[v])}
    })
}

export async function getBooksForLibrary(library: string, page: number = 0) {
    const numRows = 10;
    const start = page * numRows;

    const result = await doSolrMetadataSearch([
        ["q", '*:*'],
        ["fq", `library_s:${quote(library)}`],
        ["fq", "type:book"],
        ["sort", "book_id_s asc"],
        ["start", start.toString()],
        ["rows", numRows.toString()]
    ])
    const books = result.response.docs;
    return await addPersonNamesToBooks(books);
}

export async function getBook(bookId: string) {
    const result = await doSolrMetadataSearch({
        q: `book_id_s:${quote(bookId)}`,
        fq: 'type:book'
    }, { cache: 'no-store' })
    const books = await addPersonNamesToBooks(result.response.docs);
    if (books.length > 0) {
        return books[0];
    } else {
        return null;
    }
}

export async function searchBooks(queryString: string) {
    const result = await doSolrMetadataSearch({
        q: queryString,
        defType: 'dismax'
    }, { cache: 'no-store' })
    return await addPersonNamesToBooks(result.response.docs);
}

export async function getNames(library?: string) {
    const countResult = await doSolrMetadataSearch({
        q: '*:*',
        fq: 'type:person',
    });
    const numResults = countResult.response.numFound;
    const result = await doSolrMetadataSearch({
        q: '*:*',
        fq: 'type:person',
        rows: numResults,
    });

    const names = result.response.docs.map((name: any) => {
        return [name.rism_person_id_s, name.name_s];
    });
    return names;
}


export async function getPerson(person_id: string) {
    const result = await doSolrMetadataSearch({
        q: `rism_person_id_s:${person_id}`,
        fq: 'type:person',
    })
    return result.response.docs[0];
}

export async function getBooksForPerson(person_id: string, page: number = 0) {
    const numRows = 10;
    const start = page * numRows;
    const result = await doSolrMetadataSearch({
        q: `composer_ss:person_${person_id}`,
        fq: 'type:book',
        start: start.toString(),
        rows: numRows.toString()
    })
    const books = result.response.docs;
    return await addPersonNamesToBooks(books);
}
