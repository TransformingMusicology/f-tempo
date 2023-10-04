import React, { useEffect, useState } from 'react';
import {Button, Col, Form, Row} from "react-bootstrap";
import { useApiClient } from '../App';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

type Book = {
    id?: string;
    title?: string;
    library?: string;
    author?: string;
    shelfmark?: string;
    rism?: string;
    thumbnail?: string;
    external?: string;
};

function BrowseSearch() {
    const apiClient = useApiClient();
    const [books, setBooks] = useState<Book[]>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");

    const queryParam = searchParams.get("query");

    useEffect(() => {
        if (!queryParam) {
            console.log("no query");
            return;
        }
        let ignore = false;
        apiClient.searchBook(queryParam).then(books => {
            console.log("got data");
            if (!ignore) {
                setBooks(books);
                setQuery(queryParam!);
            }
        });
        return () => {
            ignore = true;
        };
    }, [queryParam]);

    if (!books) {
        return <></>;
    }

    return <><Row>
        <Col sm={2} />
        <Col>
            <h3>Search</h3>
            <Form onSubmit={(e) => {
                e.preventDefault();
                // TODO: Just update query and re-search
                navigate(`/browse/search?query=${query}`);
            }}>
                <Form.Control type="text" value={query} onChange={(e: any) => {
                    setQuery(e.target.value);
                }} />
                <Button type="submit">Search</Button>
            </Form>
        </Col>
    </Row>
    <Row>
        <Col>
            <h2>Search</h2>
            <h3>{queryParam}</h3>
            <table className="table">
                <thead><tr>
                    <th>Library</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Shelfmark</th>
                    <th>RISM</th>
                </tr></thead>
                <tbody>
                    {books.map(book => {
                        console.log(book);
                        const id = book.id!;
                        const bookName = book.title!;
                        const libraryName = book.library!;
                        const author = book.author!;
                        const shelfmark = book.shelfmark!;
                        const rism = book.rism!;
                        return <tr key={id}>
                            <td><Link to={`/browse/library/${libraryName}`}>{libraryName}</Link></td>
                            <td><Link to={`/browse/library/${libraryName}/${id}`}>{bookName}</Link></td>
                            <td>{author}</td>
                            <td>{shelfmark}</td>
                            <td>{rism}</td>
                        </tr>;
                    })}
                </tbody>
            </table>
        </Col>
    </Row></>;
}

export default BrowseSearch;