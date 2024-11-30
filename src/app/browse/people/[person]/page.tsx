import React from 'react';
import {getBooksForPerson, getPerson} from "@/services/metadata";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import BookSearchResult from "@/app/components/BookSearchResult";

export default async function Page(props: { params: Promise<{ person: string }> }) {
    const params = await props.params;
    const person_id = decodeURIComponent(params.person);
    const books = await getBooksForPerson(person_id);
    const person = await getPerson(person_id);
    return <Row>
        <Col>
            <h2>Browse the F-Tempo corpus by person</h2>
            <h3>{person.name_s}</h3>
            <BookSearchResult books={books} />
        </Col>
    </Row>;
}
