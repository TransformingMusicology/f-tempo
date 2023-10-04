import React, { useEffect, useState } from 'react';
import {Button, Col, Form, Row} from "react-bootstrap";
import { useApiClient } from './App';
import { Link, useNavigate } from 'react-router-dom';

function BrowseLoader() {
    const apiClient = useApiClient();
    const [libraries, setLibraries] = useState<string[]>([]);
    const [names, setNames] = useState<string[]>([]);
    const [query, setQuery] = useState<string>("");
    const navigate = useNavigate();

    useEffect(() => {
        let ignore = false;
        apiClient.getLibraries().then(libraries => {
            if (!ignore) {
                setLibraries(libraries);
            }
        });
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        let ignore = false;
        apiClient.getNames().then(names => {
            if (!ignore) {
                setNames(names);
            }
        });
        return () => {
            ignore = true;
        };
    }, []);

    return <><Row>
        <Col sm={2} />
        <Col>
            <h3>Search</h3>
            <Form onSubmit={(e) => {
                e.preventDefault();
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
        <Col sm={2} />
        <Col>
            <h3>Browse the F-Tempo corpus by library</h3>
            <ul>
                {libraries.map(library => {
                    const libraryName = library[0];
                    return <li key={libraryName}><Link to={`/browse/library/${libraryName}`}>
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
                {names.map(person => {
                    const personName = person[0];
                    const workCount = person[1];
                    return <li key={personName}><Link to={`/browse/people/${personName}`}>
                        {personName}</Link> ({workCount} works)</li>;
                })}
            </ul>
        </Col>
    </Row>
    </>;
}

export default BrowseLoader;