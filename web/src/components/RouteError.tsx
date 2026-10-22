import {Alert, Button} from 'react-bootstrap';
import {Link, isRouteErrorResponse, useNavigate, useRouteError} from 'react-router';
import {DEFAULT_PAGE_ID} from '../config';

export default function RouteError() {
    const error = useRouteError();
    const navigate = useNavigate();

    let title = 'Something went wrong';
    let message: string;
    if (isRouteErrorResponse(error)) {
        title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
        message = typeof error.data === 'object' && error.data && 'message' in error.data
            ? String((error.data as {message: unknown}).message) : error.statusText;
    } else {
        message = error instanceof Error ? error.message : String(error);
    }

    return (
        <Alert variant="danger" className="mt-3">
            <Alert.Heading>{title}</Alert.Heading>
            <p>{message}</p>
            <div className="d-flex gap-2">
                <Button variant="outline-danger" size="sm" onClick={() => navigate(0)}>Try again</Button>
                <Link to={`/page/${DEFAULT_PAGE_ID}`} className="btn btn-outline-secondary btn-sm">Go to the start page</Link>
                <Link to="/search" className="btn btn-outline-secondary btn-sm">Search by ID</Link>
            </div>
        </Alert>
    );
}
