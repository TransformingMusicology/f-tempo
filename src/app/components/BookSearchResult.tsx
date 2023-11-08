import Link from "next/link";
import React from "react";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

function TooltipLink({ id, children, title, href }: { id: string, children: React.ReactNode, title: string, href: string }) {
    return <OverlayTrigger placement={"bottom"} overlay={<Tooltip id={id}>{title}</Tooltip>}>
        <Link href={href}>{children}</Link>
    </OverlayTrigger>
}

export default function BookSearchResult(props: { books: any[]; }) {
    return <table className="table">
        <thead><tr>
            <th style={{width: "10%"}}>Library</th>
            <th style={{width: "20%"}}>Title</th>
            <th style={{width: "50%"}}>Composer</th>
            <th style={{width: "10%"}}>Shelfmark</th>
            <th style={{width: "10%"}}>RISM</th>
        </tr></thead>
        <tbody>
        {props.books.map((book: any) => {
            const id = book.book_id_s!;
            const title = book.title_s;
            const standardized_title = book.standardized_title_s;
            const libraryName = book.library_s;
            const shelfmark = book.shelfmark_s;
            const rism = book.rism_source_s!;
            return <tr key={id}>
                <td><Link href={`/browse/library/${libraryName}`}>{libraryName}</Link></td>
                <td><TooltipLink href={`/browse/library/${libraryName}/${id}`} title={title} id={id}>{standardized_title}</TooltipLink></td>
                <td>{book.people?.map((person: any, i: number) => {
                        return [
                            i > 0 && ", ",
                            <Link key={person}
                                  href={`/browse/people/${person.rism_person_id_s}`}>{person.name_s}</Link>]
                    }
                )}</td>
                <td>{shelfmark}</td>
                <td><Link href={`https://rism.online/sources/${rism}`}>Source {rism}</Link></td>
            </tr>;
        })}
        </tbody>
    </table>
}
