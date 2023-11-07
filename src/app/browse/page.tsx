import type { Metadata } from 'next'
import {getLibraries, getNames} from "@/services/search";
import Link from "next/link";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export const metadata: Metadata = {
    title: 'F-TEMPO: Browse catalogue',
}

export const dynamic = 'force-dynamic'

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
                        const personId = person[0];
                        const personName = person[1];
                        return <li key={personName}><Link href={`/browse/people/${personId}`}>
                            {personName}</Link></li>;
                    })}
                </ul>
            </Col>
        </Row>
    </>

}
