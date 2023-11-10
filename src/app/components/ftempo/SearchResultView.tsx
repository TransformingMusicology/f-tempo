import {getBook, searchById} from "@/services/search";
import SearchResultViewClient from "@/app/components/ftempo/SearchResultViewClient";
import {SearchResultProps} from "@/app/components/ftempo/SearchResultList";

type ResultType = {
    id: string;
    book: string;
    library: string;
    score: number;
    codestring: string;
    num_matched_words: number;
    num_words: number;
    jaccard: number;
}

export default async function SearchResultView(props: SearchResultProps) {

    const {currentPage: page, numResults, collectionsToSearch} = props;
    const results = await searchById(page.siglum, collectionsToSearch, numResults, 0, "jaccard");

    const book = await getBook(props.currentPage.book);

    return <SearchResultViewClient results={results} book={book} />;
}
