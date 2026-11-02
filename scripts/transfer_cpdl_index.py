"""Export/import stored CPDL Solr documents, regenerating schema copy fields.

Usage: transfer_cpdl_index.py export|import SOLR_CORE_URL DIRECTORY
The target must have no CPDL documents or exactly the exported IDs (safe rerun).
Historical documents are never deleted or replaced.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def request(url, body=None):
    req = Request(url, data=json.dumps(body).encode() if body is not None else None,
                  headers={'Content-Type': 'application/json'})
    with urlopen(req, timeout=180) as response:
        return json.load(response)


def documents(core, fields='*'):
    cursor = '*'
    docs = []
    while True:
        result = request(core + '/select?' + urlencode(dict(q='library:cpdl', fl=fields,
            rows=500, sort='id asc', cursorMark=cursor, wt='json')))
        docs.extend(result['response']['docs'])
        next_cursor = result['nextCursorMark']
        if cursor == next_cursor:
            return docs
        cursor = next_cursor


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['export', 'import'])
    parser.add_argument('core')
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    core = args.core.rstrip('/')
    destination = args.directory
    if args.action == 'export':
        docs = documents(core)
        if not docs:
            raise ValueError('No CPDL documents found')
        for doc in docs:
            doc.pop('_version_', None)
            doc.pop('_root_', None)
        paths = sorted({doc['mei_path'] for doc in docs})
        for path in paths:
            if not path.startswith('cpdl/') or '..' in Path(path).parts:
                raise ValueError(f'Unexpected MEI path: {path}')
        destination.mkdir(parents=True, exist_ok=True)
        (destination / 'documents.json').write_text(json.dumps(docs))
        (destination / 'files.txt').write_text(''.join(path[5:] + '\n' for path in paths))
        print(f'Exported {len(docs)} voices, {len(paths)} MEI files')
    else:
        docs = json.loads((destination / 'documents.json').read_text())
        if not docs or any(doc.get('library') != 'cpdl' for doc in docs):
            raise ValueError('Expected a nonempty CPDL-only export')
        ids = {doc['id'] for doc in docs}
        if len(ids) != len(docs):
            raise ValueError('Duplicate IDs')
        existing = {doc['id'] for doc in documents(core, 'id')}
        if existing - ids:
            raise ValueError('Target contains CPDL IDs absent from export; reconcile before import')
        for start in range(0, len(docs), 200):
            request(core + '/update', docs[start:start + 200])
        request(core + '/update', {'commit': {}})
        if {doc['id'] for doc in documents(core, 'id')} != ids:
            raise ValueError('Imported IDs differ from export')
        print(f'Imported and verified {len(ids)} CPDL voices')


if __name__ == '__main__':
    main()
