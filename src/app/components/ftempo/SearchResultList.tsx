import {CurrentPageData} from "@/app/components/ftempo/LeftPane";
import {searchById} from "@/services/search";
import SearchResultListClient from "@/app/components/ftempo/SearchResultListClient";

export type SearchResultProps = {
    currentPage: CurrentPageData,
    numResults: number,
    collectionsToSearch: string[],
}

export default async function SearchResultList(props: SearchResultProps) {

    const {currentPage: page, numResults, collectionsToSearch} = props;
    const results = await searchById(page.siglum, collectionsToSearch, numResults, 0, "jaccard");

    return <SearchResultListClient results={results} />
}
