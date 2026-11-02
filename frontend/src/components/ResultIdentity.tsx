export default function ResultIdentity({id, title, book, part_name, part_number}: {
    id: string; title?: string; book?: string; part_name?: string; part_number?: string;
}) {
    if (!id.startsWith('cpdl_')) return <span className="page-id">{id}</span>;
    return <span title={id}>
        <span className="d-block fw-semibold">{title || 'Untitled score'}</span>
        <span className="d-block small text-muted">{book?.replaceAll('_', ' ')} · {part_name || `Part ${part_number ?? ''}`}</span>
    </span>;
}
