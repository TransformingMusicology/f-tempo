import type {SearchResult} from '../api';
import type {NoteRange} from '../components/ScoreOverlay';

export function continuityHover(evidence: SearchResult['continuity'], index: number): {query: NoteRange[]; match: NoteRange[]} {
    const passage = evidence?.passages.find(p => index >= p.queryStart && index < p.queryStart + p.length);
    if (!passage || !evidence) return {query: [], match: []};
    const start = Math.min(index, passage.queryStart + passage.length - evidence.n);
    const match = passage.matchStart + start - passage.queryStart;
    return {query: [[start, start + evidence.n]], match: [[match, match + evidence.n]]};
}
