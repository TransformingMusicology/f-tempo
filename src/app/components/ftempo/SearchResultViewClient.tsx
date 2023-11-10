"use client"

import {useSearchParams} from "next/navigation";

export default function SearchResultViewClient(props: {results: any}) {

    const search = useSearchParams();
    const searchN = search.get('n');
    const searchNNumber = Number(searchN);

    let actualIndex = 0;
    if (searchNNumber < 1) {
        actualIndex = 0;
    } else if (searchNNumber > props.results.results.length) {
        actualIndex = props.results.results.length - 1;
    } else {
        actualIndex = searchNNumber - 1;
    }

    const result = props.results.results[actualIndex];

    return <div>
        <img
            src={`https://uk-dev-ftempo.rism.digital/img/jpg/${result.id}.jpg`}
            alt="x"
            style={{width: "100%"}} />
    </div>
}
