import {Button} from 'react-bootstrap';
import type {SearchResponse, SearchResult} from '../api/types';
import {scanImageUrl} from '../config';
import ScanImage from './ScanImage';
import {TitlePageButton, TitlePageImage, useTitlePageHold} from './TitlePageHold';

type Props = {
    response: SearchResponse;
    result: SearchResult | null;
    isQuery: boolean;
    /** Title page of this result is being held from the results list. */
    heldFromList: boolean;
    onSearchWith: (id: string) => void;
};

export default function ResultPane({response, result, isQuery, heldFromList, onSearchWith}: Props) {
    const {held, setHeld} = useTitlePageHold();

    if (!result) {
        return <div className="pane result-pane"><p className="text-muted">Select a result to see it here.</p></div>;
    }

    const wordKind = response.representation === '5gram' ? '5-grams' : 'MAWs';
    const showTitlePage = (held || heldFromList) && result.titlepage;

    return (
        <div className="pane result-pane">
            <div className="pane-toolbar">
                <Button size="sm" variant="primary" onClick={() => onSearchWith(result.id)} title="Search with this page (Enter)">
                    Search with this page
                </Button>
            </div>
            <div className="pane-heading">
                <span className="pane-label">{isQuery ? 'Selected result (the query page)' : 'Selected result'}</span> <code>{result.id}</code>
                <TitlePageButton titlepage={result.titlepage} label={result.id} setHeld={setHeld} />
            </div>
            <p className="small text-muted mb-1">
                {result.numMatchedWords} of {result.numWords} {wordKind} in this page match the query
                ({response.numQueryWords} in the query).
            </p>
            {showTitlePage
                ? <TitlePageImage titlepage={result.titlepage} label={result.id} />
                : <ScanImage src={scanImageUrl(result.id)} alt={`Scan of ${result.id}`} />}
        </div>
    );
}
