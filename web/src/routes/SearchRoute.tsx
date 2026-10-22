import {useLoaderData, useLocation} from 'react-router';
import PageView from '../components/PageView';
import type {SearchLoaderData} from '../search/loaders';

/** Renders the page or codestring search view from its loader data. */
export default function SearchRoute() {
    const data = useLoaderData() as SearchLoaderData;
    const location = useLocation();
    // Remount on every new search (path or options). Navigations run inside a React transition,
    // which would otherwise keep the previous results on screen instead of showing the loading
    // skeleton; a fresh Suspense boundary shows it. Component state (notices, held buttons) resets too.
    return <PageView key={`${location.pathname}${location.search}`} data={data} />;
}
