import {useLoaderData} from 'react-router';
import PageView from '../components/PageView';
import type {SearchLoaderData} from '../search/loaders';

/** Renders the page or codestring search view from its loader data. */
export default function SearchRoute() {
    const data = useLoaderData() as SearchLoaderData;
    // Key on the query so component state (navigation notices, held buttons) resets between queries.
    const key = data.kind === 'page' ? `page:${data.page.id}` : `code:${data.codestring}`;
    return <PageView key={key} data={data} />;
}
