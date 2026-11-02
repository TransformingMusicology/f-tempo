import {EXAMPLES, type Example} from './exampleList';

interface Props {
    onPick: (example: Example) => void;
    onClose: () => void;
}

/** The curated example searches, shown full-width above the panes while open. */
export default function Examples({onPick, onClose}: Props) {
    return (
        <div className="card mb-2">
            <div className="card-header py-1 d-flex justify-content-between align-items-center">
                <span className="small fw-semibold">Example searches</span>
                <button type="button" className="btn-close btn-sm" aria-label="Close examples" onClick={onClose}/>
            </div>
            <div className="card-body py-2">
                <table className="table table-striped table-sm examples-table mb-0">
                    <tbody>
                        {EXAMPLES.map(example => (
                            <tr key={example.id}>
                                <td className="text-nowrap">
                                    <button type="button" className="btn btn-link btn-sm p-0"
                                            onClick={() => onPick(example)}>
                                        View
                                    </button>
                                </td>
                                <td className="page-id text-nowrap">{example.id}</td>
                                <td>{example.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
