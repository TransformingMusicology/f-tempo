import {Link} from 'react-router';

export default function HelpPage() {
    return (
        <div className="help-page container-lg">
            <h1>Help</h1>
            <nav className="small mb-3">
                <a href="#about">About</a> · <a href="#searching">Searching</a> · <a href="#navigation">Navigation and shortcuts</a> ·{' '}
                <a href="#ranking">Search types and ranking</a> · <a href="#results">Results</a> · <a href="#comparison">Comparing pages</a> ·{' '}
                <a href="#upload">Uploading an image</a> · <a href="#titlepages">Title pages</a>
            </nav>

            <h2 id="about">About Early Music Online Search</h2>
            <p>
                Early Music Online (EMO) was originally (July 2018) based on a collection of digital images of 16th-century
                printed music from the British Library (GB-Lbl). It has since been expanded with images from the
                Bibliothèque nationale de France (F-Pn), the Berlin Staatsbibliothek (D-Bsb), the Polish National Library
                in Warsaw (PL-Wn) and almost half a million pages from the Bayerische Staatsbibliothek in Munich (D-Mbs).
            </p>
            <p>
                The images have been subjected to optical music recognition using Aruspix, and the musical contents
                indexed for efficient searching using{' '}
                <a href="http://doc.gold.ac.uk/~mas01tc/ISMIR2018_draft.pdf" target="_blank" rel="noreferrer">a method based on
                minimal absent words</a>. The interface finds pages containing music similar to that on a query page. It
                makes no use of library metadata (titles, composers, printers, dates or places).
            </p>
            <p>Enquiries to <a href="mailto:t.crawford@gold.ac.uk?Subject=EMO%20Search%20Enquiry">Tim Crawford</a>.</p>

            <h2 id="searching">Searching</h2>
            <p>
                The page shown on the left is the query. Browse to a page with the book and page buttons or a random
                page, then press Enter or click <em>Search this page</em>. <em>Enter a page ID</em> reveals a box for
                searching a specific page by its ID. <em>Example searches</em> in the header lists curated queries
                with notes on what they reveal.
            </p>
            <p>
                <em>Repeat last search</em> returns to the most recent search, including its settings, after you have
                browsed elsewhere. The browser's Back and Forward buttons also work, because every search is a URL that
                can be bookmarked and shared.
            </p>
            <p>
                <Link to="/code">Search by codestring</Link> accepts an interval codestring directly: one character per
                interval between consecutive notes, as shown under <em>Query codestring</em> once a search has run.
            </p>

            <h2 id="navigation">Navigation and shortcuts</h2>
            <p>These keys work whenever the keyboard focus is not in a text box or other control:</p>
            <table className="table table-sm w-auto">
                <tbody>
                    <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Select the previous / next result (down wraps to the top)</td></tr>
                    <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Show the previous / next page of the current book</td></tr>
                    <tr><td><kbd>Shift</kbd>+<kbd>←</kbd> / <kbd>→</kbd></td><td>Show the first page of the previous / next book</td></tr>
                    <tr><td><kbd>\</kbd></td><td>Show a random page from the whole collection</td></tr>
                    <tr><td><kbd>Enter</kbd></td><td>Search with the page ID in the search box</td></tr>
                    <tr><td><kbd>Shift</kbd>+<kbd>Enter</kbd></td><td>Search using the selected result as the new query</td></tr>
                </tbody>
            </table>
            <p>
                Browsing to another page clears the results; the search box keeps the new page's ID ready to search.
                Selecting a result shows it on the right without changing the query. A random page may contain little or
                no music, in which case a search will give few meaningful results.
            </p>

            <h2 id="ranking">Search types and ranking</h2>
            <p>Two representations of each page are indexed, each with three rankings:</p>
            <ul>
                <li>
                    <strong>Minimum Absent Words (MAWs)</strong>. <em>Jaccard</em> ranks by the Jaccard similarity of the
                    query's and the page's sets of MAWs, which compensates for pages with many notes. <em>Boolean
                    overlap</em> ranks simply by how many of the query's words the page contains, so long pages are
                    favoured. <em>Solr BM25</em> uses the search engine's own relevance score. Pages with fewer than ten
                    MAWs are excluded from MAW results.
                </li>
                <li>
                    <strong>Interval 5-grams</strong>. Every run of five consecutive intervals is indexed. <em>Cosine</em>{' '}
                    and <em>Jaccard</em> compare 5-gram frequencies; they are computed exactly within the best 1,000
                    candidates found by BM25, and the results heading says so when more candidates existed. <em>Solr
                    BM25</em> ranks the candidates directly.
                </li>
            </ul>
            <p>
                The score column shows what each ranking measures: a similarity percentage for Jaccard and cosine, the
                number of query words matched for Boolean overlap, and the percentage of the top result's score for
                BM25. The thin red marker on every bar shows the interval 5-gram cosine similarity between the query and
                that result, whichever ranking produced the list. Changing the search type, ranking, number of results
                or collections re-runs the current search.
            </p>

            <h2 id="results">Results</h2>
            <p>
                Click a result, or use the arrow keys, to show it on the right with a note of how many of its words match
                the query. <em>Search from this result</em> makes it the new query. When the query page itself appears
                in the list it is marked <span className="badge text-bg-info">query</span>.
            </p>

            <h2 id="comparison">Comparing pages</h2>
            <p>
                With <em>Compare recognised notes</em> switched on, the notes recognised by Aruspix are drawn over both scans.
                Notes that begin an interval n-gram also found on the other page are pink; the rest are teal. Hover over
                a pink note to outline that passage and the corresponding passages on the other page. The shared n-gram
                length can be set from 3 to 12 and each scan can be hidden to see the recognised notes alone.{' '}
                <em>Magnify on hover</em>, which is independent of the comparison, shows a magnified view of the scan
                under the pointer.
            </p>
            <p>
                Some pages have no recognised-note data, in which case only the scan is shown. The recognition is
                imperfect, so the notes may not line up exactly with the print.
            </p>

            <h2 id="upload">Uploading an image</h2>
            <p>
                <Link to="/image">Search with image upload</Link> lets you use your own image of a page of music. After
                you choose a file a preview is shown; <em>Upload and search</em> sends it to the server, where it is
                recognised and searched using Minimum Absent Words ranked by Jaccard similarity across all collections.
                This takes a few seconds longer than a normal search. The feature is experimental: it may fail for some
                images and gives meaningless results for images that are not of music.
            </p>

            <h2 id="titlepages">Title pages</h2>
            <p>
                Where a thumbnail of a book's title page is stored (currently for the Munich collection), a{' '}
                <em>Title page</em> button appears above the scan. Some library copies lack a title page; in that case
                the first page of music is usually shown instead.
            </p>
        </div>
    );
}
