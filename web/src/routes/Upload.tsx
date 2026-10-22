import {useState, type FormEvent} from 'react';
import {Alert, Button, Col, Form, Row} from 'react-bootstrap';
import {useNavigate} from 'react-router';
import {uploadImage} from '../api/client';
import {codeUrl, defaultOptions} from '../search/params';
import {uploadStore} from '../uploadStore';

const MAX_BYTES = 25 * 1024 * 1024;

export default function Upload() {
    const navigate = useNavigate();
    const [chosen, setChosen] = useState<{file: File; previewUrl: string} | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const file = chosen?.file ?? null;
    const previewUrl = chosen?.previewUrl ?? null;

    const replaceChosen = (next: {file: File; previewUrl: string} | null) => {
        // Release the previous preview unless the results view still shows it.
        if (chosen && ![...uploadStore.values()].includes(chosen.previewUrl)) URL.revokeObjectURL(chosen.previewUrl);
        setChosen(next);
    };

    const choose = (files: FileList | null) => {
        setError(null);
        if (!files || files.length === 0) {
            replaceChosen(null);
            return;
        }
        if (files.length > 1) {
            setError('Choose one image.');
            replaceChosen(null);
            return;
        }
        const candidate = files[0];
        if (!candidate.type.startsWith('image/')) {
            setError(`"${candidate.name}" is not an image.`);
            replaceChosen(null);
            return;
        }
        if (candidate.size > MAX_BYTES) {
            setError('The image is larger than 25 MB.');
            replaceChosen(null);
            return;
        }
        replaceChosen({file: candidate, previewUrl: URL.createObjectURL(candidate)});
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!file) {
            setError('Choose an image to upload.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const codestring = await uploadImage(file);
            if (previewUrl) uploadStore.set(codestring, previewUrl);
            navigate(codeUrl(codestring, defaultOptions()));
        } catch (err) {
            setError(`Recognition failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Row className="justify-content-center">
            <Col md={8} lg={6}>
                <h2 className="h4">Search with an uploaded image</h2>
                <p className="small text-muted">
                    Upload a scan of a page of 16th-century printed music. The server recognises the notes,
                    turns them into an interval codestring, and searches with it. All search types and rankings are
                    available on the results page. Recognition takes a while.
                </p>
                <Form onSubmit={submit}>
                    <Form.Group controlId="upload-file" className="mb-2">
                        <Form.Label>Image file</Form.Label>
                        <Form.Control type="file" accept="image/*" onChange={e => choose((e.target as HTMLInputElement).files)} disabled={busy} />
                    </Form.Group>
                    {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                    {previewUrl && file && (
                        <div className="upload-preview mb-2">
                            <img src={previewUrl} alt={`Preview of ${file.name}`} />
                        </div>
                    )}
                    <Button type="submit" disabled={!file || busy}>{busy ? 'Recognising music… please wait' : 'Upload and search'}</Button>
                </Form>
            </Col>
        </Row>
    );
}
