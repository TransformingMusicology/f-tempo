import {useId} from 'react';
import {NGRAM_LENGTHS} from '../util/params';

interface Props {
    showNotes: boolean;
    onShowNotes: (value: boolean) => void;
    zoom: boolean;
    onZoom: (value: boolean) => void;
    ngramLength: number;
    onNgramLength: (value: number) => void;
}

/** Comparison controls shared by the query and result panes; everything is off until chosen. */
export default function CompareToolbar({showNotes, onShowNotes, zoom, onZoom, ngramLength, onNgramLength}: Props) {
    const id = useId();
    return (
        <div className="small compare-toolbar">
            <div className="d-flex align-items-center gap-3 mb-1">
                <div className="form-check form-switch mb-0">
                    <input className="form-check-input" type="checkbox" id={`${id}-notes`} checked={showNotes}
                           onChange={e => onShowNotes(e.target.checked)}/>
                    <label className="form-check-label" htmlFor={`${id}-notes`}>Compare recognised notes</label>
                </div>
                <div className="d-flex align-items-center gap-1">
                    <label htmlFor={`${id}-ng`} className={`mb-0${showNotes ? '' : ' text-muted'}`}>n-gram length</label>
                    <select id={`${id}-ng`} className="form-select form-select-sm w-auto" value={ngramLength}
                            onChange={e => onNgramLength(Number(e.target.value))} disabled={!showNotes}>
                        {NGRAM_LENGTHS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
            </div>
            <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" id={`${id}-zoom`} checked={zoom}
                       onChange={e => onZoom(e.target.checked)}/>
                <label className="form-check-label" htmlFor={`${id}-zoom`}>Magnify on hover</label>
            </div>
        </div>
    );
}
