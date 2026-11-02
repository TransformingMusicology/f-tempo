import {useState} from 'react';
import {Button, Form} from 'react-bootstrap';
import {
    NUM_RESULTS_OPTIONS, RANKINGS, RANKING_LABELS, REPRESENTATIONS, REPRESENTATION_LABELS,
    DEFAULT_CONTINUITY_MINIMUM, defaultRanking, isRankingFor, type Representation, type SearchOptions,
} from '../search/params';

type Props = {
    options: SearchOptions;
    catalogues: string[];
    onChange: (options: SearchOptions) => void;
    onSearch: () => void;
    searchLabel: string;
    /** True while a search is in flight: changes are ignored instead of starting another search. */
    disabled: boolean;
};

/**
 * Edit options locally; submit them together with Search.
 */
export default function SearchOptionsPanel({options, catalogues, onChange, onSearch, searchLabel, disabled}: Props) {
    const [collectionError, setCollectionError] = useState<string | null>(null);
    const minimum = options.continuityMinimum ?? DEFAULT_CONTINUITY_MINIMUM;
    const selected = options.collections.length ? new Set(options.collections) : new Set(catalogues);

    const apply = (next: SearchOptions) => {
        if (!disabled) onChange(next);
    };
    const validMinimum = Number.isFinite(minimum) && minimum >= 0 && minimum <= 100;

    const setRepresentation = (representation: Representation) => {
        const ranking = isRankingFor(representation, options.ranking) ? options.ranking : defaultRanking(representation);
        apply({...options, representation, ranking});
    };

    const toggleCollection = (name: string) => {
        const next = new Set(selected);
        if (next.has(name)) next.delete(name); else next.add(name);
        if (next.size === 0) {
            setCollectionError('Select at least one collection.');
            return;
        }
        setCollectionError(null);
        const collections = next.size === catalogues.length ? [] : catalogues.filter(c => next.has(c));
        apply({...options, collections});
    };

    return (
        <Form className="search-options" onSubmit={event => {
            event.preventDefault();
            if (!disabled && (!options.continuity || validMinimum)) onSearch();
        }}>
            <div className="d-grid mb-2">
                <Button type="submit" variant="primary" size="sm" title="Search with the query page (Enter)" disabled={disabled || (!!options.continuity && !validMinimum)}>{searchLabel}</Button>
            </div>
            <fieldset disabled={disabled}>
            <Form.Group className="mb-2" controlId="opt-representation">
                <Form.Label className="mb-0 small">Search type</Form.Label>
                <Form.Select size="sm" value={options.representation} onChange={e => setRepresentation(e.target.value as Representation)}>
                    {REPRESENTATIONS.map(r => <option key={r} value={r}>{REPRESENTATION_LABELS[r]}</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2" controlId="opt-ranking">
                <Form.Label className="mb-0 small">Result ranking</Form.Label>
                <Form.Select size="sm" value={options.ranking} onChange={e => {
                    const ranking = e.target.value;
                    if (isRankingFor(options.representation, ranking)) apply({...options, ranking});
                }}>
                    {RANKINGS[options.representation].map(r => <option key={r} value={r}>{RANKING_LABELS[r]}</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2" controlId="opt-num-results">
                <Form.Label className="mb-0 small">Results to display</Form.Label>
                <Form.Select size="sm" value={options.numResults} onChange={e => apply({...options, numResults: Number(e.target.value)})}>
                    {NUM_RESULTS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Check className="mb-2 small" id="opt-continuity" label="Filter scattered matches"
                checked={!!options.continuity} onChange={e => apply({...options, continuity: e.target.checked || undefined, continuityMinimum: minimum})} />
            {options.continuity && <>
                <Form.Group className="mb-2" controlId="opt-continuity-minimum">
                    <Form.Label className="small mb-0">Minimum continuity (%)</Form.Label>
                    <Form.Control size="sm" type="number" min={0} max={100} step="any" required value={Number.isFinite(minimum) ? minimum : ''}
                        onChange={e => apply({...options, continuityMinimum: e.target.value === '' ? NaN : Number(e.target.value)})} aria-describedby="continuity-threshold-help" />
                    <Form.Text id="continuity-threshold-help">0 keeps all results. Increase this to filter out matches that jump around the music.</Form.Text>
                </Form.Group>
            </>}
            <fieldset className="mb-2">
                <legend className="small mb-0">Collections to search</legend>
                <div className="collection-checks">
                    {catalogues.map(name => (
                        <Form.Check
                            key={name}
                            inline
                            type="checkbox"
                            id={`opt-collection-${name}`}
                            label={name}
                            checked={selected.has(name)}
                            onChange={() => toggleCollection(name)}
                        />
                    ))}
                </div>
                {collectionError && <div className="text-danger small">{collectionError}</div>}
            </fieldset>
            </fieldset>
        </Form>
    );
}
