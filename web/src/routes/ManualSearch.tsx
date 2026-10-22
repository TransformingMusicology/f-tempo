import {useState, type FormEvent} from 'react';
import {Button, Col, Form, Row} from 'react-bootstrap';
import {useNavigate} from 'react-router';
import {ApiError, getMetadata} from '../api/client';
import {codeUrl, defaultOptions, pageUrl} from '../search/params';

export default function ManualSearch() {
    const navigate = useNavigate();
    const [pageId, setPageId] = useState('');
    const [pageError, setPageError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [codestring, setCodestring] = useState('');
    const [codeError, setCodeError] = useState<string | null>(null);

    const submitPage = async (event: FormEvent) => {
        event.preventDefault();
        const id = pageId.trim();
        if (!id) {
            setPageError('Enter a page ID, for example GB-Lbl_K2h7_092_1.');
            return;
        }
        setChecking(true);
        setPageError(null);
        try {
            const page = await getMetadata(id);
            navigate(pageUrl(page.id, defaultOptions()));
        } catch (error) {
            setPageError(error instanceof ApiError && error.status === 404
                ? `No page with the ID "${id}" is indexed.`
                : `Could not look up the page: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setChecking(false);
        }
    };

    const submitCode = (event: FormEvent) => {
        event.preventDefault();
        const cs = codestring.replace(/\s/g, '');
        if (!cs) {
            setCodeError('Enter an interval codestring.');
            return;
        }
        if (!/^[A-Za-z-]+$/.test(cs)) {
            setCodeError('A codestring contains only letters (one per interval) and "-" for repeated notes.');
            return;
        }
        setCodeError(null);
        navigate(codeUrl(cs, defaultOptions()));
    };

    return (
        <Row className="justify-content-center">
            <Col md={8} lg={6}>
                <h2 className="h4">Search by page ID</h2>
                <Form onSubmit={submitPage} className="mb-4">
                    <Form.Group controlId="manual-page-id">
                        <Form.Label>Page ID</Form.Label>
                        <div className="d-flex gap-2">
                            <Form.Control value={pageId} onChange={e => setPageId(e.target.value)} placeholder="GB-Lbl_K2h7_092_1" isInvalid={pageError !== null} />
                            <Button type="submit" disabled={checking}>{checking ? 'Checking…' : 'Open'}</Button>
                        </div>
                        {pageError && <div className="text-danger small mt-1">{pageError}</div>}
                        <Form.Text>Opens the page and searches with it.</Form.Text>
                    </Form.Group>
                </Form>

                <h2 className="h4">Search by interval codestring</h2>
                <Form onSubmit={submitCode}>
                    <Form.Group controlId="manual-codestring">
                        <Form.Label>Codestring</Form.Label>
                        <Form.Control as="textarea" rows={4} value={codestring} onChange={e => setCodestring(e.target.value)} isInvalid={codeError !== null} placeholder="e-ABaAb-a-AaaFfAAa…" />
                        {codeError && <div className="text-danger small mt-1">{codeError}</div>}
                        <Form.Text>
                            One letter per diatonic interval between consecutive notes: upper case ascending, lower case descending,
                            "-" for a repeated note. The codestring of any indexed page is available from the API as
                            <code> /api/get_codestring?id=…</code>.
                        </Form.Text>
                    </Form.Group>
                    <Button type="submit" className="mt-2">Search</Button>
                </Form>
            </Col>
        </Row>
    );
}
