import {createBrowserRouter, redirect} from 'react-router';
import RootLayout from './components/RootLayout';
import RouteError from './components/RouteError';
import {DEFAULT_PAGE_ID} from './config';
import Examples from './routes/Examples';
import Help from './routes/Help';
import ManualSearch from './routes/ManualSearch';
import NotFound from './routes/NotFound';
import SearchRoute from './routes/SearchRoute';
import Upload from './routes/Upload';
import {codeLoader, pageLoader, revalidateUnlessHashOnly} from './search/loaders';

export const router = createBrowserRouter([
    {
        path: '/',
        Component: RootLayout,
        ErrorBoundary: RouteError,
        children: [
            {index: true, loader: () => redirect(`/page/${DEFAULT_PAGE_ID}`)},
            {path: 'page/:id', loader: pageLoader, shouldRevalidate: revalidateUnlessHashOnly, Component: SearchRoute, ErrorBoundary: RouteError},
            {path: 'code', loader: codeLoader, shouldRevalidate: revalidateUnlessHashOnly, Component: SearchRoute, ErrorBoundary: RouteError},
            {path: 'search', Component: ManualSearch},
            {path: 'upload', Component: Upload},
            {path: 'examples', Component: Examples},
            {path: 'help', Component: Help},
            {path: '*', Component: NotFound},
        ],
    },
]);
