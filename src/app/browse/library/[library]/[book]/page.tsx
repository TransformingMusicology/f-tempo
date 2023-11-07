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
            <h3 title={book.title_s}>{book.standardized_title_s!}</h3>
            <table className='table'>
                <tbody>
                <tr>
                    <th>Composer</th>
                    <td>{book.people?.map((person: any, i: number) => {
                            return [
                                i > 0 && ", ",
                                <Link key={person}
                                      href={`/browse/people/${person.rism_person_id_s}`}>{person.name_s}</Link>]
                        }
                    )}</td>
                </tr>
                <tr>
                    <th>Publisher</th>
                    <td>{book.publisher_ss}</td>
                </tr>
                <tr>
                    <th>Place of publication</th>
                    <td>{book.place_of_publication_s}</td>
                </tr>
                <tr>
                    <th>Date of publication</th>
                    <td>{book.date_of_publication_s}</td>
                </tr>
                <tr>
                    <th>Library</th>
                    <td><Link href={`/browse/library/${book.library_s}`}>{book.library_s}</Link></td>
                </tr>
                <tr>
                    <th>Shelfmark</th>
                    <td>{book.shelfmark_s}</td>
                </tr>
                <tr>
                    <th>RISM</th>
                    <td><Link href={`https://rism.online/sources/${book.rism_source_s}`}>Source {book.rism_source_s}</Link></td>
                </tr>
                <tr>
                    <th>External</th>
                    <td><a href={book.external}>{book.external}</a></td>
                </tr>

                </tbody>
            </table>
            <img src={book.thumbnail} alt={`Thumbnail image of ${book.standardized_title_s}`} width="600px" />
        </Col>
        <Col sm={2} />
    </Row>;
}
