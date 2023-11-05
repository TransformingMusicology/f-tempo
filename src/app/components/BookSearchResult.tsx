import Link from "next/link";
import React from "react";


export default function BookSearchResult(props: { books: any[]; }) {
    return <table className="table">
        <thead><tr>
            <th>Library</th>
            <th>Title</th>
            <th>Author</th>
            <th>Shelfmark</th>
            <th>RISM</th>
        </tr></thead>
        <tbody>
        {props.books.map((book: any) => {
            const id = book.id!;
            const bookName = book.title!;
            const libraryName = book.library!;
            const author = book.author!;
            const shelfmark = book.shelfmark!;
            const rism = book.rism!;
            return <tr key={id}>
                <td><Link href={`/browse/library/${libraryName}`}>{libraryName}</Link></td>
                <td><Link href={`/browse/library/${libraryName}/${id}`}>{bookName}</Link></td>
                <td>{author}</td>
                <td>{shelfmark}</td>
                <td>{rism}</td>
            </tr>;
        })}
        </tbody>
    </table>
}
