import {useNavigate, useLocation} from 'react-router';
import type {PageMetadata} from '../api';
import {setScoreTarget} from '../util/scoreUrl';
import {preserveBrowse} from '../util/browseState';

export default function VoiceSelector({metadata}: {metadata: PageMetadata | null}) {
    const navigate = useNavigate();
    const location = useLocation();
    if (!metadata?.parts?.length) return null;
    function go(id: string, search = false) {
        const params = preserveBrowse(new URLSearchParams(location.search), metadata);
        const browsing = params.get('view') === 'browse' || (params.get('view') !== 'results' && !params.has('q'));
        params.set('view', search || !browsing ? 'results' : 'browse');
        params.delete('sel');
        if (search) setScoreTarget(params, 'q', id);
        else {
            params.delete('q');
            params.delete('part');
            params.set('page', id);
        }
        navigate(`${location.pathname}?${params}`);
    }
    return <div className="d-flex gap-2 my-2 align-items-center">
        <label>Voice <select aria-label="Voice to search" value={metadata.siglum}
            onChange={e => go(e.target.value)}>
            {metadata.parts.map(part => <option key={part.id} value={part.id}>{part.part_name || `Part ${part.part_number}`}</option>)}
        </select></label>
        <button className="btn btn-primary btn-sm" onClick={() => go(metadata.siglum, true)}>Search {metadata.part_name || 'this voice'}</button>
    </div>;
}
