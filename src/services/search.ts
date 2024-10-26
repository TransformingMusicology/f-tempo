function quote(str: string) {
    return `"${str}"`;
}

async function doSolrContentSearch(args: string[][] | Record<string, string>, init?: RequestInit) {
    const params = new URLSearchParams(args)
    const searchUrl = process.env.SOLR_NOTE_CORE + "select?";
    const res = await fetch(searchUrl + params, init);

    if (!res.ok) {
        throw new Error('Failed to fetch data')
    }
    return await res.json();
}

async function getMawsForSiglum(siglum: string) {
    const result = await doSolrContentSearch({
        q: `siglum:${quote(siglum)}`,
        'fl': 'maws'
    })
    if (result.response.numFound >= 1) {
        const doc = result.response.docs[0];
        return (doc as any).maws;
    } else {
        return "";
    }
}

/**
 *
 * @param maws A list of maws
 * @param collections_to_search A list of collections/libraries to search
 * @param num_results how many results to return
 * @param boolean_sim if true, use solr's BooleanSimilarity instead of BM25
 * @returns
 */
async function searchMawsSolr(maws: string[], collections_to_search: string[], num_results: number, similarity_type: 'boolean'|'jaccard'|'solr'): Promise<any> {
    maws = maws.map(quote);
    collections_to_search = collections_to_search.map(quote)

    const fields: {maws_boolean?: number, maws?: number} = {};
    let params :any;
    if (similarity_type === 'boolean') {
        const fieldname = "maws_boolean";
        params = [
            ["q", `${fieldname}: (${maws.join(" ")})`],
            ["fl", '*,score'],
            ["rows", num_results]
        ]
    } else if (similarity_type === 'solr') {
        const fieldname = "maws";
        params = [
            ["q", `${fieldname}: (${maws.join(" ")})`],
            ["fl", '*,score'],
            ["rows", num_results]
        ]
    } else if (similarity_type === 'jaccard') {
        // If we know the number of items in the search term, we can get solr to compute jaccaard itself and
        // sort by it:
        //  div(query($q), sub(add(nummaws, 270), query($q))) desc
        // $q is a solr variable based on the ?q parameter, and query() re-runs a query. This has the effect
        // of returning the "score", which is the number of matching elements (intersection)
        // we know the list of maws is unique, so we can compute set union by nummawsA + nummawsB - intersection
        // store the number of maws in each doc in the 'nummaws' field, count the number of maws in the
        // search query in js, and re-compute $q again for the number in intersection again
        const sortparam = `div(query($q), sub(add(nummaws, ${maws.length}), query($q)))`;
        let sortquery = `${sortparam} desc`
        const fieldname = "maws_boolean";
        params = [
            ["q", `${fieldname}: (${maws.join(" ")})`],
            ["fl", `*,score,jaccard:${sortparam}`],
            ["sort", sortquery],
            ["rows", num_results]
        ]
    } else {
        throw new UnknownSearchTypeError();
    }

    if (collections_to_search.length) {
        params.push(["fq", `library:(${collections_to_search.join(" OR ")})`])
    }
    params.push(["fq", "-notmusic:true"])
    const result = await doSolrContentSearch(params)
    if (result.response.numFound >= 1) {
        return result.response.docs;
    }
    return []
}

export async function searchRandomId(timestamp: string) {
    const key = `random_${timestamp}`;
    const result = await doSolrContentSearch({
        q: "*:*",
        'fl': "siglum,library,book",
        rows: "1",
        sort: `${key} desc`
    }, { cache: 'no-store' })
    if (result.response.numFound >= 1) {
        return result.response.docs[0];
    }
    return {};
}

export async function getMetadata(id: string) {
    const result = await doSolrContentSearch({
        q: `siglum:${id}`,
        fl: "siglum,library,book",
        start: "0",
        rows: "1",
    })
    if (result.response.numFound >= 1) {
        return result.response.docs[0];
    }
    return {};
}


export async function getPagesForBook(libraryId: string, bookId: string) {
    const result = await doSolrContentSearch({
        q: `id:${libraryId}_${bookId}*`,
        sort: "id asc"
    });
    return result.response.docs;
}


export async function searchNextPageId(library: string, bookId: string, pageId: string, direction: "prev" | "next") {
    let params;
    if (direction === "next") {
        params = [
            ["q", "*:*"],
            ["q.op", "AND"],
            ["fq", `id:${library}_${bookId}*`],
            ["fq", `id:{${library}_${bookId}_${pageId} TO *]`],
            ["sort", "id asc"]
        ]
    } else {
       params = [
           ["q", "*:*"],
           ["q.op", "AND"],
           ["fq", `id:${library}_${bookId}*`],
           ["fq", `id:[* TO ${library}_${bookId}_${pageId}]`],
           ["sort", "id desc"]
        ]
    }
    const result = await doSolrContentSearch(params);
    if (direction === "next") {
        if (result.response.numFound > 0) {
            return result.response.docs[0];
        } else {
            return null;
        }
    } else {
        if (result.response.numFound > 1) {
            return result.response.docs[1];
        } else {
            return null;
        }
    }

}

export async function searchNextBookId(library: string, bookId: string, direction: "prev" | "next") {

}

export async function searchById(id: string, collections_to_search: string[], num_results: number, threshold: number,  similarity_type: 'boolean'|'jaccard'|'solr') {
    const maws = await getMawsForSiglum(id);
    if (maws) {
        return await search(maws.split(" "), collections_to_search, num_results, threshold, similarity_type);
    } else {
        throw new NoMawsForDocumentError(`cannot get maws for document ${id}`)
    }
}

export async function searchByCodestring(codestring: string, collections_to_search: string[], num_results: number, threshold: number, similarity_type: 'boolean'|'jaccard'|'solr') {
    // const maws = getMawsForCodestrings({cs: codestring});
    // if (maws['cs']) {
    //     return await search(maws['cs'], collections_to_search, num_results, threshold, similarity_type);
    // } else {
    //     // `maw` binary ran successfully, but no maws were generated for this input.
    //     // treat this as the same as there not being enough words
    //     throw new MawsTooShortError();
    // }
}

/**
 * Search for
 * @param words array of MAWs to search for
 * @param collections_to_search
 * @param num_results Filter by this many results
 * @param threshold
 * @param similarity_type
 * @returns {boolean|[]|*[]|*}
 */
export async function search(words: string[], collections_to_search: string[], num_results: number, threshold: number,  similarity_type: 'boolean'|'jaccard'|'solr'): Promise<SearchResponse> {
    if (words.length < 6) {
        throw new MawsTooShortError();
    }
    //console.time("search");

    // Safety check that the words are all unique:
    const search_uniq_words = new Set(words);

    const maws_results = await searchMawsSolr(words, collections_to_search, num_results * 2, similarity_type);
    const maws_with_scores: SearchResult[] = maws_results.map((doc: { score: number; maws: string; siglum: string; intervals: string; book: string; library: string; titlepage?: string;}) => {
        const unique_maws = new Set(doc.maws.split(" "));
        const num_matched_words = setIntersection(unique_maws, search_uniq_words).size;
        return {
            // ID of the document
            id: doc.siglum,
            book: doc.book,
            library: doc.library,
            score: doc.score,
            codestring: doc.intervals.split(" ").join(""),
            // Number of words in common between search term and document
            num_matched_words: num_matched_words,
            // Number of unique words in the document
            num_words: unique_maws.size,
            // Jaccard similarity
            jaccard: 1 - (num_matched_words / (unique_maws.size + search_uniq_words.size - num_matched_words)),
            titlepage: doc.titlepage
        };
    });

    const result = gateScoresByThreshold(maws_with_scores, threshold, similarity_type === 'jaccard', num_results);
    return {
        numQueryWords: search_uniq_words.size,
        numResults: maws_results.numResults,
        results: result
    };
}

/**
 *
 * @param scores_pruned
 * @param threshold "median" to threshold by the median score, otherwise a float value
 * @param jaccard
 * @param num_results
 * @returns
 */
function gateScoresByThreshold(scores_pruned: SearchResult[], threshold: "median" | number, jaccard: boolean, num_results: number) {
    // if threshold is set in URL, stop returning results when delta < threshold
    if (threshold) {
        const out_array = [];
        out_array[0] = scores_pruned[0];  // the identity match, or at least the best we have
        for (let p = 1; p < scores_pruned.length; p++) {
            let delta = 0;
            if (jaccard) {
                delta = jacc_delta(scores_pruned, p);
            } else {
                delta = scores_pruned[p - 1].num_matched_words - scores_pruned[p].num_matched_words;
            }
            if (threshold === "median") {
                threshold = getMedian(scores_pruned, jaccard);
            }
            if (delta >= threshold) {
                out_array[p] = scores_pruned[p];
                out_array[p].delta = delta;
            } else {
                num_results = p - 1;
                break;
            }
        }
        return out_array.slice(0, num_results);
    } else {
        // return the first num_results results
        return scores_pruned.slice(0, num_results);
    }
}


function jacc_delta (array: SearchResult[], n: number) {
    return array[n].jaccard - array[n - 1].jaccard;
}

function getMedian(array: SearchResult[], jaccard: boolean){
    const values = [];
    if(jaccard) {
        for(let i = 0;i < array.length;i++) {
            values.push(array[i].jaccard);
        }
    }
    else {
        for(let i = 0;i < array.length;i++) {
            values.push(array[i].num_matched_words);
        }
    }
    values.sort((a, b) => a - b);
    let median = (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2;
    //console.log("Median = " + median);
    return median;
}


function setIntersection(setA: Set<string>, setB: Set<string>) {
    let _intersection = new Set();
    for (let elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem);
        }
    }
    return _intersection;
}


export class UnknownSearchTypeError extends Error {
    constructor() {
        super("Unknown search type, must be one of 'boolean', 'solr', or 'jaccard'");
    }
}

export class NextIdNotFound extends Error {
    constructor(message: string) {
        super();
        this.message = message;
    }
}

export type SearchResponse = {
    numQueryWords: number
    numResults: number
    results: SearchResult[]
}

export class NoMawsForDocumentError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class MawsTooShortError extends Error {
    constructor() {
        super("Maws are too short");
    }
}

export type SearchResult = {
    id: string
    book: string;
    library: string;
    score: number;
    codestring: string
    num_matched_words: number
    num_words: number
    jaccard: number
    delta?: number
    titlepage?: string
}
