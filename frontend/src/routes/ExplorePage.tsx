import {useLoaderData} from 'react-router';
import {pageImageUrl} from '../config';
import {scoreColumnLabel} from '../util/scores';
import CompareToolbar from '../components/CompareToolbar';
import ContinuityDetails from '../components/ContinuityDetails';
import ContinuitySummary from '../components/ContinuitySummary';
import Notice from '../components/Notice';
import PagePane from '../components/PagePane';
import QueryBar from '../components/QueryBar';
import ResultStrip from '../components/ResultStrip';
import ResultIdentity from '../components/ResultIdentity';
import type {SearchLoaderData} from './SearchPage';
import {useSearchSession} from './useSearchSession';

/**
 * Alternative layout for the corpus search: the two scans take most of the
 * window side by side, results are a thumbnail strip on the left, and the
 * search options collapse into a summary in the query bar.
 */
export default function ExplorePage() {
    const data = useLoaderData() as SearchLoaderData;
    const s = useSearchSession(data, '/explore');
    const searched = data.query !== null;

    return (
        <div className="explore">
            <QueryBar displayedId={data.displayedId} metadata={data.metadata} searched={searched}
                      settings={s.draftSettings} catalogues={s.catalogues} busy={s.busy}
                      onStep={s.step} onRandom={s.random}
                      onSearch={id => { s.setTarget(id); s.submitSearchWith(id); }}
                      onSettingsChange={s.changeSettings} onRepeat={s.repeat}/>

            <aside className="explore-results">
                {data.search?.status === 'error' && (
                    <Notice kind="danger" message={data.search.message} action={{label: 'Retry', onClick: s.revalidate}}/>
                )}
                {s.searchData && (
                    <div className="explore-results-head small text-muted">
                        {s.searchData.continuityApplied ? `${s.searchData.numResults} accepted · ${s.results.length - s.searchData.numResults} rejected shown` : `${s.results.length} results`} · {s.searchData.numQueryWords} {s.searchData.representation === '5gram' ? '5-grams' : 'words'} in query
                        {s.searchData.candidateLimited && s.ranking !== 'solr' && (
                            <> · reranked top {s.searchData.candidateLimit} of {s.searchData.candidatesFound} BM25 candidates</>
                        )}
                        <div>{scoreColumnLabel(s.ranking)}</div>
                    </div>
                )}
                {s.searchData && <ContinuitySummary data={s.searchData}/>}
                {s.searchData && !s.searchData.continuityApplied && s.results.length === 0 && <Notice kind="info" message="No results for this query."/>}
                {s.searchData && s.results.length > 0 && (
                    <ResultStrip data={s.searchData} ranking={s.ranking} queryId={data.query}
                                 queryCodestring={data.queryCodestring} selectedId={s.selected?.id ?? null}
                                 onSelect={id => s.setViewParam('sel', id)}/>
                )}
                {!s.searchData && data.search?.status !== 'error' && (
                    <div className="small text-muted p-2">
                        Browse to a page, or click its ID to type one, then press Enter or Search. Results appear here
                        as thumbnails; use ↑ and ↓ to move through them.
                    </div>
                )}
            </aside>

            <section className="explore-panes">
                <PagePane key={`query-${data.displayedId}`}
                          heading={<>{searched ? 'Query' : 'Page'} <ResultIdentity id={data.displayedId ?? ''} {...data.metadata}/></>}
                          subheading={data.metadata ? undefined : data.metadataError ?? 'This page ID is not in the index.'}
                          imageUrl={data.displayedId ? pageImageUrl(data.displayedId) : null}
                          imageAlt={`Scan of page ${data.displayedId}`}
                          meiId={data.displayedId} codestring={data.queryCodestring} titlepageUrl={s.queryTitlepage}
                          matches={s.comparison.queryMatches} highlightRanges={s.comparison.queryRanges}
                          onHoverNote={s.comparison.onHoverQuery} showNotes={s.showNotes} zoom={s.zoom}>
                    <Notice message={s.notice} onDismiss={() => s.setNotice(null)}/>
                    {data.metadata?.notmusic === true && <Notice kind="warning" message="This page is identified as not music. Search is disabled."/>}
                </PagePane>

                {s.selected && s.searchData ? (
                    <PagePane key={`result-${s.selected.id}`}
                              heading={<>{s.selected.belowThreshold ? 'Filtered-out result' : 'Result'} {s.selected.originalRank ?? s.selectedIndex + 1} <ResultIdentity {...s.selected}/></>}
                              subheading={<>{s.selected.num_matched_words} of {s.selected.num_words}{' '}
                                  {s.searchData.representation === '5gram' ? '5-grams' : 'words'} match the query
                                  {s.selectedScore && <> · {scoreColumnLabel(s.ranking)} {s.selectedScore.text}</>}</>}
                              imageUrl={pageImageUrl(s.selected.id)} imageAlt={`Scan of page ${s.selected.id}`}
                              meiId={s.selected.id} codestring={s.selected.codestring} titlepageUrl={s.selected.titlepage ?? null}
                              matches={s.comparison.matchMatches} highlightRanges={s.comparison.matchRanges}
                              onHoverNote={s.comparison.onHoverMatch} showNotes={s.showNotes} zoom={s.zoom}
                              actions={
                                  <button type="button" className="btn btn-primary btn-sm" onClick={s.searchFromSelected}
                                          title="Search using this result as the query (Shift+Enter)">
                                      Use as query
                                  </button>
                              }/>
                ) : (
                    <div className="card explore-empty">
                        <div className="card-body small text-muted">
                            {s.searchData ? 'No result to show.' : 'The selected result is shown here, beside the query.'}
                        </div>
                    </div>
                )}
            </section>

            {s.searchData && s.results.length > 0 && (
                <footer className="explore-compare">
                    <CompareToolbar showNotes={s.showNotes} onShowNotes={s.setShowNotes} zoom={s.zoom} onZoom={s.setZoom}
                                    ngramLength={s.ngramLength} onNgramLength={n => s.setViewParam('ng', String(n))}/>
                    {s.showNotes && <ContinuityDetails key={s.selected?.id} result={s.selected} evidence={s.comparison.evidence} queryLength={data.queryCodestring?.replace(/\s/g, '').length ?? 0}
                        cursor={s.comparison.graphIndex} onHover={s.comparison.onGraphHover}/>}
                </footer>
            )}
        </div>
    );
}
