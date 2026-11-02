interface Props {
    kind?: 'warning' | 'danger' | 'info';
    message: string | null;
    onDismiss?: () => void;
    action?: {label: string; onClick: () => void};
}

export default function Notice({kind = 'warning', message, onDismiss, action}: Props) {
    if (!message) return null;
    return (
        <div className={`alert alert-${kind} alert-dismissible py-1 px-2 small mb-2`} role="alert">
            {message}
            {action && (
                <button type="button" className="btn btn-link btn-sm p-0 ms-2 align-baseline" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
            {onDismiss && <button type="button" className="btn-close btn-sm p-2" aria-label="Dismiss" onClick={onDismiss}/>}
        </div>
    );
}
