import React from 'react';
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Link from "next/link";
import {getBook} from "@/services/search";


export default async function BrowseBook({ params }: { params: { library: string, book: string} }) {

    const book = await getBook(params.book);

    if (!book) {
        return <></>;
    }

    return <Row>
        <Col sm={2} />
        <Col>
            <h3>{book.title!}</h3>
            <table className='table'>
                <tbody>
                <tr>
                    <th>Author</th>
                    <td><Link href={`/browse/people/${book.author}`}>{book.author}</Link></td>
                </tr>
                <tr>
                    <th>Other names</th>
                    <td>{book.person?.map((person: string, i: number) => [
                        i > 0 && ", ",
                        <Link key={person} href={`/browse/people/${person}`}>{person}</Link>]
                    )}</td>
                </tr>
                <tr>
                    <th>Library</th>
                    <td><Link href={`/browse/library/${book.library}`}>{book.library}</Link></td>
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
    </Row>;
}
