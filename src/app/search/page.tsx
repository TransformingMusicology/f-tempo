import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";

import {queryBook} from "@/services/search";
import {Metadata} from "next";
import BookSearchResult from "@/app/components/BookSearchResult";
import React from "react";

export const metadata: Metadata = {
    title: 'Search',
}

export const dynamic = 'force-dynamic'

export default async function BrowseSearch({searchParams}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {

    const queryParam = searchParams.q;
    let queryParamString = '';
    if (Array.isArray(queryParam)) {
        queryParamString = queryParam[0];
    } else {
        queryParamString = queryParam || '';
    }

    const books = await queryBook(queryParamString);

    return <><Row>
        <Col sm={2} />
        <Col>
            <h3>Search</h3>
            <Form method="GET">
                <FormControl type="text" name="q" defaultValue={queryParam} />
                <Button type="submit">Search</Button>
            </Form>
        </Col>
    </Row>
        <Row>
            <Col>
                <h2>Search</h2>
                <h3>{queryParam}</h3>
                <BookSearchResult books={books} />
            </Col>
        </Row></>;
}
