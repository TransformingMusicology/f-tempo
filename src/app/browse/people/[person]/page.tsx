import React from 'react';
import {getBooksForPerson} from "@/services/search";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import BookSearchResult from "@/app/components/BookSearchResult";

export default async function Page({ params }: { params: { person: string } }) {
    const name = decodeURIComponent(params.person);
    const books = await getBooksForPerson(name);
    return <Row>
        <Col>
            <h2>Browse the F-Tempo corpus by person</h2>
            <h3>{name}</h3>
            <BookSearchResult books={books} />
        </Col>
    </Row>;
}
