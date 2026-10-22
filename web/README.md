# F-TEMPO web interface

React + Vite + React Router (Data Mode) single-page app. The Express server in the parent
directory provides the `/api/*` endpoints and serves this app's production build from
`web/dist`.

## Run

Start the API first, from the repository root. For local development against the PC's
Solr and the data under `../storage`:

    FTEMPO_CONFIG=config/local_config.json npm start

Both this and the Vite dev server must be started from your own terminal: on macOS a Node
process launched by an agent fails the Local Network permission check and cannot reach
`alastairpc.local`.

Then either open the production build at http://localhost:8000 (after `npm run build`
here), or for live reloading:

    npm run dev          # http://localhost:5173, proxies /api to localhost:8000

Set `FTEMPO_API_URL=http://alastairpc.local:8000` to proxy to the PC's server instead.
Set `VITE_IMAGE_BASE_URL` to change where page scans are loaded from (default
`https://search.f-tempo.org/img/jpg/`).

## Checks

    npm run typecheck
    npm run lint
    npm test
    npm run build

## URLs

- `/page/:id?rep=&rank=&n=&c=` shows a page without searching; `/search/:id?…` shows it and
  runs its search. Options: `rep` = `maw` | `5gram`, `rank` = `jaccard` | `boolean` | `solr`
  (MAWs) or `cosine` | `jaccard` | `solr` (5-grams), `n` = 5..30, `c` = comma-separated
  library sigla. Defaults are omitted. On `/search` the hash holds the selected result's page ID.
- `/code?cs=…` searches with an interval codestring (uploads end up here).
- `/search`, `/upload`, `/examples`, `/help`.
