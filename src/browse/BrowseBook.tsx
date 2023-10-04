import React, { useEffect, useState } from 'react';
import {Col, Form, Row} from "react-bootstrap";
import { useApiClient } from '../App';
import { Link, useParams } from 'react-router-dom';

type Book = {
    id?: string;
    title?: string;
    library?: string;
    author?: string;
    person?: string[];
    shelfmark?: string;
    rism?: string;
    thumbnail?: string;
    external?: string;
};

function BrowseBook() {
    const apiClient = useApiClient();
    const [book, setBook] = useState<Book>();

    const { book: bookId } = useParams<{ book: string }>();

    useEffect(() => {
        if (!bookId) {
            return;
        }
        let ignore = false;
        apiClient.getBook(bookId).then(book => {
            if (!ignore) {
                setBook(book);
            }
        });
        return () => {
            ignore = true;
        };
    }, [bookId]);

    if (!book) {
        return <></>;
    }

    return <><Row>
        <Col sm={2} />
        <Col>
            <h3>{book.title!}</h3>
            <table className='table'>
                <tbody>
                    <tr>
                        <th>Author</th>
                        <td><Link to={`/browse/people/${book.author}`}>{book.author}</Link></td>
                    </tr>
                    <tr>
                        <th>Other names</th>
                        <td>{book.person?.join(", ")}</td>
                    </tr>
                    <tr>
                        <th>Library</th>
                        <td>{book.library}</td>
                    </tr>
                    <tr>
                        <th>Shelfmark</th>
                        <td>{book.shelfmark}</td>
                    </tr>
                    <tr>
                        <th>RISM</th>
                        <td>{book.rism}</td>
                    </tr>
                    <tr>
                        <th>External</th>
                        <td><a href={book.external}>{book.external}</a></td>
                    </tr>
                    
                </tbody>
            </table>
            <img src={book.thumbnail} alt={`Thumbnail image of ${book.title}`} width="600px" />
        </Col>
        <Col sm={2} />
    </Row>
    </>;
}

export default BrowseBook;