import {Col, Row, Table} from 'react-bootstrap';
import {Link} from 'react-router';
import {EXAMPLES} from '../examples';
import {scanImageUrl} from '../config';

export default function Examples() {
    return (
        <Row className="justify-content-center">
            <Col lg={10} xl={8}>
                <h2 className="h4">Example searches</h2>
                <p className="small text-muted">Each example opens a query page and runs the default search (minimal absent words, Jaccard ranking).</p>
                <Table hover className="examples-table">
                    <tbody>
                        {EXAMPLES.map(example => (
                            <tr key={example.id}>
                                <td className="example-thumb">
                                    <Link to={`/page/${encodeURIComponent(example.id)}`}>
                                        <img src={scanImageUrl(example.id)} alt="" loading="lazy" />
                                    </Link>
                                </td>
                                <td>
                                    <Link to={`/page/${encodeURIComponent(example.id)}`}><code>{example.id}</code></Link>
                                    <div>{example.description}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Col>
        </Row>
    );
}
