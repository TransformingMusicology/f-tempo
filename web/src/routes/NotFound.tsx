import {Link} from 'react-router';
import {DEFAULT_PAGE_ID} from '../config';

export default function NotFound() {
    return (
        <div className="mt-4">
            <h2 className="h4">There is nothing at this address</h2>
            <p><Link to={`/page/${DEFAULT_PAGE_ID}`}>Go to the start page</Link></p>
        </div>
    );
}
