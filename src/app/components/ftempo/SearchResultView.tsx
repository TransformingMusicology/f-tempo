import {searchById} from "@/services/search";
import {CurrentPageData} from "@/app/components/ftempo/LeftPane";
import SearchResultViewClient from "@/app/components/ftempo/SearchResultViewClient";

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

export default async function SearchResultView(props: {currentPage: CurrentPageData}) {

    const {currentPage: page} = props;
    const results = await searchById(page.siglum, ["GB-Lbl"], 10, 0, "jaccard");

    return <SearchResultViewClient results={results} />;
}
