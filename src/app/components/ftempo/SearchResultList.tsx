import {CurrentPageData} from "@/app/components/ftempo/LeftPane";
import {searchById} from "@/services/search";
import SearchResultListClient from "@/app/components/ftempo/SearchResultListClient";

type SearchResultProps = {
    currentPage: CurrentPageData
}

export default async function SearchResultList(props: SearchResultProps) {

    const {currentPage: page} = props;
    const results = await searchById(page.siglum, ["GB-Lbl"], 10, 0, "jaccard");

    return <SearchResultListClient results={results} />
}
