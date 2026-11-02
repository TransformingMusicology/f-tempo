import {useId} from 'react';
import {rankingFor, RANKINGS, REPRESENTATIONS, RESULT_COUNTS, type SearchSettings} from '../util/params';

interface Props {
    settings: SearchSettings;
    catalogues: string[];
    onChange: (settings: SearchSettings) => void;
}

/** Search type, ranking, result count and collection pickers; shared by both search layouts. */
export default function SettingsFields({settings, catalogues, onChange}: Props) {
    const ids = useId();
    const selected = settings.collections ?? catalogues;
    const noCollections = selected.length === 0;

    function toggleCollection(name: string) {
        const next = selected.includes(name) ? selected.filter(c => c !== name) : [...selected, name];
        onChange({...settings, collections: next.length === catalogues.length ? null : next});
    }

    return (
        <>
            <div className="row g-2 mb-2">
                <div className="col">
                    <label htmlFor={`${ids}-rep`} className="form-label mb-0 small">Search type</label>
                    <select id={`${ids}-rep`} className="form-select form-select-sm" value={settings.representation}
                            onChange={e => {
                                const representation = e.target.value as SearchSettings['representation'];
                                onChange({...settings, representation, ranking: rankingFor(representation, null)});
                            }}>
                        {REPRESENTATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
                <div className="col">
                    <label htmlFor={`${ids}-rank`} className="form-label mb-0 small">Result ranking</label>
                    <select id={`${ids}-rank`} className="form-select form-select-sm" value={settings.ranking}
                            onChange={e => onChange({...settings, ranking: e.target.value as SearchSettings['ranking']})}>
                        {RANKINGS[settings.representation].map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
                <div className="col-auto">
                    <label htmlFor={`${ids}-n`} className="form-label mb-0 small">Results</label>
                    <select id={`${ids}-n`} className="form-select form-select-sm" value={settings.numResults}
                            onChange={e => onChange({...settings, numResults: Number(e.target.value)})}>
                        {RESULT_COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
            </div>

            <fieldset className="mb-2">
                <legend className="form-label mb-0 small">Collections to search</legend>
                <div className="d-flex flex-wrap gap-2">
                    {catalogues.map(name => (
                        <div className="form-check form-check-inline me-0" key={name}>
                            <input className="form-check-input" type="checkbox" id={`${ids}-coll-${name}`}
                                   checked={selected.includes(name)} onChange={() => toggleCollection(name)}/>
                            <label className="form-check-label small" htmlFor={`${ids}-coll-${name}`}>{name}</label>
                        </div>
                    ))}
                    <button type="button" className="btn btn-link btn-sm p-0"
                            onClick={() => onChange({...settings, collections: noCollections ? null : []})}>
                        {noCollections ? 'Select all' : 'Clear all'}
                    </button>
                </div>
                {noCollections && <div className="form-text text-danger">Select at least one collection.</div>}
            </fieldset>
        </>
    );
}

/** One-line description of the settings, e.g. "MAWs · Jaccard · 10 results · all collections". */
export function describeSettings(settings: SearchSettings, catalogues: string[]): string {
    const rep = settings.representation === 'maw' ? 'MAWs' : '5-grams';
    const rank = RANKINGS[settings.representation].find(r => r.value === settings.ranking)?.label ?? settings.ranking;
    const coll = settings.collections === null ? 'all collections'
        : settings.collections.length === 0 ? 'no collections'
        : settings.collections.length === catalogues.length ? 'all collections'
        : settings.collections.join(', ');
    return `${rep} · ${rank} · ${settings.numResults} results · ${coll}`;
}
