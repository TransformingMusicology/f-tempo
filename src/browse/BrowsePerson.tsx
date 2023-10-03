import React, { useEffect, useState } from 'react';
import {Col, Form, Row} from "react-bootstrap";
import { useApiClient } from '../App';
import { Link, useParams } from 'react-router-dom';

function BrowsePerson() {
    const apiClient = useApiClient();
    const [books, setBooks] = useState<any[]>([]);
    const { person } = useParams<{ person: string }>();

    useEffect(() => {
        if (!person) {
            return;
        }
        let ignore = false;
        apiClient.getBooksForPerson(person).then(books => {
            if (!ignore) {
                setBooks(books);
            }
        });
        return () => {
            ignore = true;
        };
    }, [person]);

    return <><Row>
        <Col>
            <h2>Browse the F-Tempo corpus by person</h2>
            <h3>{person}</h3>
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
    </Row>
    </>;
}

export default BrowsePerson;