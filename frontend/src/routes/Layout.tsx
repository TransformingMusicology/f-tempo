import {useState} from 'react';
import {NavLink, Outlet, isRouteErrorResponse, useLocation, useNavigate, useRouteError} from 'react-router';
import {getCatalogues} from '../api';
import Examples from '../components/Examples';
import {applySettings, parseSettings} from '../util/params';

export interface RootData {
    catalogues: string[];
}

export async function rootLoader(): Promise<RootData> {
    return {catalogues: await getCatalogues()};
}

export default function Layout() {
    const [examplesOpen, setExamplesOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const link = ({isActive}: {isActive: boolean}) => `nav-link${isActive ? ' active' : ''}`;

    /** Run an example with whatever search settings the current URL carries. */
    function pickExample(id: string) {
        const searchRoute = ['/', '/code', '/explore'].includes(location.pathname);
        const current = new URLSearchParams(searchRoute ? location.search : '');
        const params = applySettings(new URLSearchParams(), parseSettings(current));
        params.set('q', id);
        if (current.get('ids') === '1') params.set('ids', '1');
        setExamplesOpen(false);
        navigate(`${location.pathname === '/explore' ? '/explore' : '/'}?${params}`);
    }

    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container-fluid">
                    <span className="navbar-brand">Early Music Online Search</span>
                    <ul className="navbar-nav flex-row flex-wrap gap-3">
                        <li className="nav-item"><NavLink to="/" end className={link}>Search within corpus</NavLink></li>
                        <li className="nav-item"><NavLink to="/explore" className={link}>Explore (new layout)</NavLink></li>
                        <li className="nav-item"><NavLink to="/code" className={link}>Search by codestring</NavLink></li>
                        <li className="nav-item"><NavLink to="/image" className={link}>Search with image upload</NavLink></li>
                        <li className="nav-item">
                            <button type="button" className={`nav-link btn btn-link${examplesOpen ? ' active' : ''}`}
                                    aria-expanded={examplesOpen} onClick={() => setExamplesOpen(v => !v)}>
                                Example searches
                            </button>
                        </li>
                        <li className="nav-item"><NavLink to="/help" className={link}>Help</NavLink></li>
                    </ul>
                </div>
            </nav>
            <main className="app-main">
                {examplesOpen && <Examples onPick={example => pickExample(example.id)} onClose={() => setExamplesOpen(false)}/>}
                <Outlet/>
            </main>
        </>
    );
}

export function Loading() {
    return <div className="container py-4 text-muted">Loading…</div>;
}

export function ErrorPage() {
    const error = useRouteError();
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error ? error.message : 'Something went wrong';
    return (
        <div className="container py-4">
            <h1 className="h4">Something went wrong</h1>
            <p>{message}</p>
            <p><a href="/">Back to search</a></p>
        </div>
    );
}
