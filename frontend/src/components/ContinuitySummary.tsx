import type {SearchData} from '../api';

export default function ContinuitySummary({data}: {data: SearchData}) {
    if (data.continuityNotice) return <p role="status" className="small">{data.continuityNotice}</p>;
    if (!data.continuityApplied) return null;
    const kept = data.results.filter(r => !r.belowThreshold).length;
    const rejected = data.results.length - kept;
    return <p className="small" role="status">
        {kept} results meet the {data.continuityMinimum}% minimum. Checked {data.continuityCandidates} candidates;
        {' '}{data.continuityFiltered} fell below it.
        {rejected > 0 && <> The {rejected} rejected results between the first and last accepted matches are listed below them for comparison.</>}
        {kept === 0 && <> Lower the minimum and press Search to see more results.</>}
    </p>;
}
