import type {Ranking, Representation} from '../search/params';

export type PageMetadata = {
    id: string;
    library: string;
    book: string;
    titlepage?: string;
};

export type SearchResult = {
    id: string;
    library: string;
    book: string;
    titlepage?: string;
    /** Interval codestring of the page, no separators. */
    codestring: string;
    /** Unique MAWs (MAW search) or unique 5-grams (5-gram search) in the page. */
    numWords: number;
    /** How many of those are shared with the query. */
    numMatchedWords: number;
    /** 1 - Jaccard distance, in [0, 1]. */
    jaccardSimilarity: number;
    /** 5-gram cosine similarity; only present on 5-gram searches. */
    cosine?: number;
    /** Solr's score (BM25 or boolean match count) or the chosen ranking's similarity. */
    score: number;
};

export type SearchResponse = {
    representation: Representation;
    ranking: Ranking;
    numQueryWords: number;
    results: SearchResult[];
    /** 5-gram cosine/Jaccard rerank only a bounded BM25 candidate set; these report it. */
    candidateLimit?: number;
    candidatesFound?: number;
    candidateLimited?: boolean;
};

export type NextIdResponse = {
    library: string;
    book_id: string;
    page: {id: string};
};
