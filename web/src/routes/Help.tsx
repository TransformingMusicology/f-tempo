import {Col, Row, Table} from 'react-bootstrap';
import {Link} from 'react-router';

export default function Help() {
    return (
        <Row className="justify-content-center help">
            <Col lg={9} xl={7}>
                <h2 className="h4">About F-TEMPO</h2>
                <p>
                    F-TEMPO (Full-Text search of Early Music Prints Online) searches digitised 16th-century printed music by its
                    musical content. The collection began in July 2018 with about 32,000 pages from just under 200 books in the
                    British Library (GB-Lbl) and now also covers the Bibliothèque nationale de France (F-Pn), the Berlin
                    Staatsbibliothek (D-Bsb), the Polish National Library (PL-Wn) and almost half a million pages from the
                    Bayerische Staatsbibliothek (D-Mbs).
                </p>
                <p>
                    Every page image was read by the <a href="https://github.com/DDMAL/aruspix">Aruspix</a> optical music
                    recognition system. The recognised notes are reduced to a sequence of diatonic intervals (a "codestring"),
                    which is what the searches compare. Recognition errors are common, so matches are approximate by design.
                    Library metadata (titles, composers, printers, dates) is not yet part of the interface.
                </p>
                <p>Enquiries to <a href="mailto:t.crawford@gold.ac.uk?Subject=F-TEMPO%20enquiry">Tim Crawford</a>.</p>

                <h2 className="h4">Searching</h2>
                <p>
                    Showing a page searches with it: the results list is always the search for the page on the left. Move through
                    the collection with the previous/next page and book buttons, pick a random page, open one of the{' '}
                    <Link to="/examples">examples</Link>, or <Link to="/search">enter a page ID or codestring</Link>.
                    Clicking a result shows it on the right; <em>Search with this page</em> makes it the new query.
                </p>
                <p>
                    The address bar holds the query and every option, so a search can be bookmarked, shared, reloaded, and
                    revisited with the browser's back button.
                </p>

                <h2 className="h4">Search types and rankings</h2>
                <p>Two representations of a page's intervals can be searched, each with three rankings.</p>
                <Table size="sm" bordered>
                    <thead><tr><th>Search type</th><th>Ranking</th><th>What the score shows</th></tr></thead>
                    <tbody>
                        <tr><td rowSpan={3}><strong>Minimal absent words</strong> (MAWs): short interval patterns that are absent from a page, a compact fingerprint of its content. Pages with fewer than 10 MAWs cannot be searched this way.</td>
                            <td>Jaccard</td><td>Jaccard similarity between the two pages' MAW sets, as a percentage.</td></tr>
                        <tr><td>Boolean overlap</td><td>How many of the query's MAWs the page contains, shown as a count out of the query total. Long pages tend to overlap more by chance.</td></tr>
                        <tr><td>Solr BM25</td><td>The search engine's text-retrieval relevance score, shown relative to the best result because it has no absolute meaning.</td></tr>
                        <tr><td rowSpan={3}><strong>Interval 5-grams</strong>: every run of five consecutive intervals. An experimental alternative that works on short pages too.</td>
                            <td>Cosine</td><td>Cosine similarity of the two pages' 5-gram counts, as a percentage.</td></tr>
                        <tr><td>Jaccard</td><td>Jaccard similarity of the sets of distinct 5-grams.</td></tr>
                        <tr><td>Solr BM25</td><td>As above, relative to the best result.</td></tr>
                    </tbody>
                </Table>
                <p>
                    Cosine and Jaccard rankings for 5-grams are computed exactly, but only over the 1,000 best candidates found by
                    BM25. When more candidates existed the results header says so.
                </p>
                <p>
                    A short red line on each score bar shows the 5-gram cosine similarity to the query, so that the two
                    representations can be compared at a glance. It is omitted when cosine is already the ranking.
                </p>
                <p>
                    With MAW searches the query page itself is usually the first result and is marked <em>query</em>; it may be
                    absent when the page has little music.
                </p>

                <h2 className="h4">Keyboard shortcuts</h2>
                <p>Shortcuts are ignored while typing in a text field or using a form control.</p>
                <Table size="sm" bordered className="w-auto">
                    <tbody>
                        <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Select the previous / next result (down wraps to the top)</td></tr>
                        <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Previous / next page of the book</td></tr>
                        <tr><td><kbd>Shift</kbd>+<kbd>←</kbd> / <kbd>→</kbd></td><td>First page of the previous / next book</td></tr>
                        <tr><td><kbd>\</kbd></td><td>Random page</td></tr>
                        <tr><td><kbd>Enter</kbd></td><td>Search with the selected result</td></tr>
                        <tr><td><kbd>Esc</kbd></td><td>Clear the selection</td></tr>
                    </tbody>
                </Table>

                <h2 className="h4">Viewing pages</h2>
                <p>
                    Moving the pointer over a scan magnifies the region under it. Where a book's title page is known (all of the
                    Munich collection), a <em>Title page</em> button appears next to the page ID and in the results list; hold it
                    down to see the title page, release to return to the scan.
                </p>

                <h2 className="h4">Uploading an image</h2>
                <p>
                    <Link to="/upload">Upload</Link> a scan of a page of printed music and it is recognised with the same OMR system
                    as the collection, then searched as a codestring. The uploaded image is shown beside the results for the rest of
                    the session only; the search itself can be reloaded or bookmarked. Recognition is experimental and gives
                    meaningless results for images that are not music.
                </p>

                <h2 className="h4">Collections</h2>
                <p>
                    The collection checkboxes limit the search to particular libraries. Collection names are RISM library sigla:
                    D-Bsb Berlin, D-Mbs Munich, F-Pn Paris, GB-Lbl London, PL-Wn Warsaw.
                </p>
            </Col>
        </Row>
    );
}
