import React from 'react';
import {getBooksForLibrary} from "@/services/metadata";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import BookSearchResult from "@/app/components/BookSearchResult";

export default async function Page({ params }: { params: { library: string } }) {
    const name = decodeURIComponent(params.library);
    const books = await getBooksForLibrary(name);
    return <Row>
        <Col>
            <h2>Browse the F-Tempo corpus by library</h2>
            <h3>{name}</h3>
            <BookSearchResult books={books} />
        </Col>
    </Row>;
}
