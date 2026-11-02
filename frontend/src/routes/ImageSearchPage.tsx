import {useEffect, useState, type ChangeEvent} from 'react';
import {useFetcher, type ActionFunctionArgs} from 'react-router';
import {ApiError, runImageQuery, type SearchData, type SearchResult} from '../api';
import {pageImageUrl} from '../config';
import {DEFAULT_NGRAM_LENGTH} from '../util/params';
import {resultScore, scoreColumnLabel} from '../util/scores';
import CompareToolbar from '../components/CompareToolbar';
import Notice from '../components/Notice';
import PagePane from '../components/PagePane';
import ResultsTable from '../components/ResultsTable';
import {useComparison} from '../components/useComparison';
import {useShortcuts} from '../components/useShortcuts';
import {useNavigate} from 'react-router';

type UploadOutcome = {status: 'ok'; data: SearchData} | {status: 'error'; message: string};

export async function imageSearchAction({request}: ActionFunctionArgs): Promise<UploadOutcome> {
    const form = await request.formData();
    const file = form.get('user_image_file');
    if (!(file instanceof File) || file.size === 0) {
        return {status: 'error', message: 'Select an image file to upload.'};
    }
    try {
        return {status: 'ok', data: await runImageQuery(form)};
    } catch (error) {
        if (error instanceof ApiError) return {status: 'error', message: error.message};
        throw error;
    }
}

function resultSummary(result: SearchResult): string {
    return `${result.num_matched_words} of ${result.num_words} words in this page match the query`;
}

export default function ImageSearchPage() {
    const fetcher = useFetcher<UploadOutcome>();
    const navigate = useNavigate();
    function searchFromResult(id: string) {
        const params = new URLSearchParams();
        setScoreTarget(params, 'q', id);
        navigate(`/?${params}`);
    }
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [validation, setValidation] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showNotes, setShowNotes] = useState(false);
    const [zoom, setZoom] = useState(false);
    const [ngramLength, setNgramLength] = useState(DEFAULT_NGRAM_LENGTH);

    const uploading = fetcher.state !== 'idle';
    const outcome = fetcher.data ?? null;
    const searchData = outcome?.status === 'ok' ? outcome.data : null;
    const results = searchData?.results ?? [];
    const selected = results.find(r => r.id === selectedId) ?? results[0] ?? null;
    const selectedIndex = selected ? results.indexOf(selected) : -1;

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const comparison = useComparison(searchData?.query_codestring ?? null, selected?.codestring ?? null, ngramLength);

    function onFileChange(event: ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        setSelectedId(null);
        if (!files || files.length === 0) {
            setFile(null);
            setPreview(null);
            setValidation(null);
            return;
        }
        const chosen = files[0]!;
        if (!chosen.type.startsWith('image/')) {
            setFile(null);
            setPreview(null);
            setValidation('The selected file is not an image.');
            return;
        }
        setValidation(null);
        setFile(chosen);
        setPreview(URL.createObjectURL(chosen));
    }

    useShortcuts({
        up: () => { const r = results[Math.max(0, selectedIndex - 1)]; if (r) setSelectedId(r.id); },
        down: () => { const r = results[selectedIndex + 1 < results.length ? selectedIndex + 1 : 0]; if (r) setSelectedId(r.id); },
        shiftEnter: () => { if (selected) searchFromResult(selected.id); },
    });

    const selectedScore = selected && searchData ? resultScore(selected, 'jaccard', searchData) : null;

    return (
        <div className="row g-2">
            <div className="col-lg pane-col">
                <div className="card mb-2">
                    <div className="card-body py-2">
                        <fetcher.Form method="post" encType="multipart/form-data">
                            <label htmlFor="user_image_file" className="form-label mb-1">Image of a page of music to search with</label>
                            <input id="user_image_file" name="user_image_file" type="file" accept="image/*"
                                   className="form-control form-control-sm mb-2" onChange={onFileChange}/>
                            {validation && <div className="text-danger small mb-2">{validation}</div>}
                            <button type="submit" className="btn btn-primary btn-sm" disabled={!file || uploading}>
                                Upload and search
                            </button>
                            {uploading && <span className="ms-2 small text-muted">Uploading and recognising the music, please be patient…</span>}
                        </fetcher.Form>
                        <div className="form-text">
                            Uploaded images are recognised with Aruspix and searched with Minimum Absent Words ranked by
                            Jaccard similarity across every collection; the search type, ranking and collection settings
                            do not apply here.
                        </div>
                    </div>
                </div>
                {preview && (
                    <PagePane key={preview} heading="Uploaded image" imageUrl={preview} imageAlt="Uploaded image" meiId={null} codestring={searchData?.query_codestring ?? null}
                              matches={null} highlightRanges={[]} onHoverNote={() => undefined}
                              showNotes={false} zoom={zoom}
                              footer={searchData && results.length > 0 ? (
                                  <CompareToolbar showNotes={showNotes} onShowNotes={setShowNotes} zoom={zoom} onZoom={setZoom}
                                                  ngramLength={ngramLength} onNgramLength={setNgramLength}/>
                              ) : undefined}/>
                )}
            </div>

            <div className="col-lg-auto results-col">
                <div className="card">
                    <div className="card-body py-2">
                        {outcome?.status === 'error' && <Notice kind="danger" message={outcome.message}/>}
                        {searchData && results.length === 0 && <Notice kind="info" message="No results for this image."/>}
                        {searchData && results.length > 0 && (
                            <ResultsTable data={searchData} ranking="jaccard" queryId={null}
                                          queryCodestring={searchData.query_codestring ?? null}
                                          selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
                        )}
                        {!searchData && !outcome && (
                            <div className="small text-muted">Results will appear here after the upload.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="col-lg pane-col">
                {selected && searchData ? (
                    <PagePane key={selected.id}
                              heading={<>Result {selectedIndex + 1}: <span className="page-id">{selected.id}</span></>}
                              subheading={<>{resultSummary(selected)}
                                  {selectedScore && <> · {scoreColumnLabel('jaccard')} {selectedScore.text}</>}</>}
                              imageUrl={pageImageUrl(selected.id)} imageAlt={`Scan of page ${selected.id}`}
                              meiId={selected.id} codestring={selected.codestring} titlepageUrl={selected.titlepage ?? null}
                              matches={comparison.matchMatches} highlightRanges={comparison.matchRanges}
                              onHoverNote={comparison.onHoverMatch} showNotes={showNotes} zoom={zoom}
                              actions={
                                  <button type="button" className="btn btn-primary btn-sm"
                                          onClick={() => searchFromResult(selected.id)}
                                          title="Search the corpus using this result as the query (Shift+Enter)">
                                      Search from this result
                                  </button>
                              }/>
                ) : (
                    <div className="card h-100">
                        <div className="card-body py-2 small text-muted">The selected result will be shown here.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
import {setScoreTarget} from '../util/scoreUrl';
