"use client"
import {searchById} from "@/services/search";
import {SearchResultProps} from "@/app/components/ftempo/SearchResultList";
import {useSearchParams} from "next/navigation";
import React from "react";

export default async function SearchResultView(props: SearchResultProps) {

    //const book = await getBook(props.currentPage.book);

    const search = useSearchParams();
    const searchN = search.get('n');
    const searchNNumber = Number(searchN);

    const {currentPage: page, numResults, collectionsToSearch} = props;
    const results = await searchById(page.siglum, collectionsToSearch, numResults, 0, "jaccard");

    let actualIndex = 0;
    if (searchNNumber < 1) {
        actualIndex = 0;
    } else if (searchNNumber > results.results.length) {
        actualIndex = results.results.length - 1;
    } else {
        actualIndex = searchNNumber - 1;
    }

    const result = results.results[actualIndex];


    return <div>
        <img
            src={`https://uk-dev-ftempo.rism.digital/img/jpg/${result.id}.jpg`}
            alt="x"
            style={{width: "100%"}} />
    </div>;
}
