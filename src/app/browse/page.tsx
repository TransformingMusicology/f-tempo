import type { Metadata } from 'next'
import {getLibraries, getNames} from "@/services/search";
import Link from "next/link";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export const metadata: Metadata = {
    title: 'F-TEMPO: Browse catalogue',
}

export const revalidate = 1;

export default async function Page() {
    const libraries = await getLibraries();
    const names = await getNames();

    return <>
            <Row>
            <Col sm={2} />
            <Col>
                <h3>Browse the F-Tempo corpus by library</h3>
                <ul>
                    {libraries.map((library: string) => {
                        const libraryName = library[0];
                        return <li key={libraryName}><Link href={`/browse/library/${libraryName}`}>
                            {libraryName}</Link></li>;
                    })}
                </ul>
            </Col>
        </Row>
        <Row>
            <Col sm={2} />
            <Col>
                <h3>Browse the F-Tempo corpus by person</h3>
                <ul>
                    {names.map((person: [string, string]) => {
                        const personName = person[0];
                        const workCount = person[1];
                        return <li key={personName}><Link href={`/browse/people/${personName}`}>
                            {personName}</Link> ({workCount} works)</li>;
                    })}
                </ul>
            </Col>
        </Row>
    </>

}
