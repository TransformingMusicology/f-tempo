import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter, redirect, type LoaderFunctionArgs} from 'react-router';
import {RouterProvider} from 'react-router/dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import Layout, {ErrorPage, Loading, rootLoader} from './routes/Layout';
import SearchPage, {codeSearchLoader, idSearchLoader, searchShouldRevalidate} from './routes/SearchPage';
import ImageSearchPage, {imageSearchAction} from './routes/ImageSearchPage';
import HelpPage from './routes/HelpPage';
import ExplorePage from './routes/ExplorePage';

/** The old comparison popup URL: /compare?qid=…&mid=…&ng_len=… */
function compareRedirect({request}: LoaderFunctionArgs) {
    const from = new URL(request.url).searchParams;
    const qid = from.get('qid');
    if (!qid) return redirect('/');
    const params = new URLSearchParams({q: qid});
    const mid = from.get('mid');
    if (mid) params.set('sel', mid);
    const ng = from.get('ng_len');
    if (ng) params.set('ng', ng);
    return redirect(`/?${params}`);
}

const router = createBrowserRouter([
    {
        id: 'root',
        path: '/',
        Component: Layout,
        loader: rootLoader,
        shouldRevalidate: () => false,
        ErrorBoundary: ErrorPage,
        HydrateFallback: Loading,
        children: [
            {index: true, Component: SearchPage, loader: idSearchLoader, shouldRevalidate: searchShouldRevalidate},
            {path: 'code', Component: SearchPage, loader: codeSearchLoader, shouldRevalidate: searchShouldRevalidate},
            {path: 'explore', Component: ExplorePage, loader: idSearchLoader, shouldRevalidate: searchShouldRevalidate},
            {path: 'image', Component: ImageSearchPage, action: imageSearchAction},
            {path: 'help', Component: HelpPage},
            {path: 'id_searches', loader: () => redirect('/?ids=1'), Component: Loading},
            {path: 'code_searches', loader: () => redirect('/code'), Component: Loading},
            {path: 'compare', loader: compareRedirect, Component: Loading},
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
    </StrictMode>,
);
