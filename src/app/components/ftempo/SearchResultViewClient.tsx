"use client"

import {useSearchParams} from "next/navigation";
import {Row} from "react-bootstrap";
import Link from "next/link";
import React from "react";

export default function SearchResultViewClient(props: {results: any, book: any}) {

    const book = props.book;
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

        {/*{book && <Row>*/}
        {/*    <ul>*/}
        {/*        <li>Title: {book.title_s}</li>*/}
        {/*        <li>Standardized Title: {book.standardized_title_s}</li>*/}
        {/*        <li>Place of publication: {book.place_of_publication_s} ({book.date_of_publication_s})</li>*/}
        {/*        <li>Composers: {book.people?.map((person: any, i: number) => {*/}
        {/*                return [*/}
        {/*                    i > 0 && ", ",*/}
        {/*                    <Link key={person}*/}
        {/*                          href={`/browse/people/${person.rism_person_id_s}`}>{person.name_s}</Link>]*/}
        {/*            }*/}
        {/*        )}</li>*/}
        {/*        <li>Shelfmark: {book.shelfmark_s}</li>*/}
        {/*        <li>Publisher: {book.publisher_ss}</li>*/}
        {/*        <li><a href={book.catalogue_record_s}>Catalogue</a></li>*/}
        {/*    </ul>*/}
        {/*</Row>}*/}
    </div>
}
