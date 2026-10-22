import {useState} from 'react';
import {Form} from 'react-bootstrap';
import {useNavigate} from 'react-router';
import {
    NUM_RESULTS_OPTIONS, RANKINGS, RANKING_LABELS, REPRESENTATIONS, REPRESENTATION_LABELS,
    defaultRanking, isRankingFor, type Representation, type SearchOptions,
} from '../search/params';

type Props = {
    options: SearchOptions;
    catalogues: string[];
    /** Builds the URL for the same query with different options. */
    buildUrl: (options: SearchOptions) => string;
};

/** Search options. Any change navigates to the same query with the new options, which re-runs the search. */
export default function SearchOptionsPanel({options, catalogues, buildUrl}: Props) {
    const navigate = useNavigate();
    const [collectionError, setCollectionError] = useState<string | null>(null);
    const selected = options.collections.length ? new Set(options.collections) : new Set(catalogues);

    const apply = (next: SearchOptions) => navigate(buildUrl(next));

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
        <Form className="search-options" onSubmit={event => event.preventDefault()}>
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
        </Form>
    );
}
