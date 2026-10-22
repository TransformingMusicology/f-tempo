#!/usr/bin/env python3
"""Recreate JPG/MEI symlinks from a CSV without reading their targets."""

import argparse
import csv
import gzip
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='CSV or CSV.gz with kind,name,target columns')
    parser.add_argument('destination', type=Path, help='Local filesystem directory for jpg/ and mei/')
    args = parser.parse_args()
    counts = {'jpg': 0, 'mei': 0}
    created = 0
    for kind in counts:
        directory = args.destination / kind
        if directory.is_symlink():
            raise ValueError(f'Destination must be a real directory: {directory}')
        directory.mkdir(parents=True, exist_ok=True)

    opener = gzip.open if args.manifest.suffix == '.gz' else open
    with opener(args.manifest, 'rt', encoding='utf-8', newline='') as stream:
        rows = csv.DictReader(stream)
        if rows.fieldnames != ['kind', 'name', 'target']:
            raise ValueError('Expected CSV columns: kind,name,target')
        for row in rows:
            kind, name, target = row['kind'], row['name'], row['target']
            if kind not in counts or not name or name in ('.', '..') or '/' in name:
                raise ValueError(f'Invalid link name: {row}')
            if not target.startswith('/'):
                raise ValueError(f'Expected absolute link target: {row}')
            link = args.destination / kind / name
            try:
                os.symlink(target, link)
                created += 1
            except FileExistsError:
                if not link.is_symlink() or os.readlink(link) != target:
                    raise ValueError(f'Refusing to overwrite conflicting path: {link}')
            if os.readlink(link) != target:
                raise RuntimeError(f'Link verification failed: {link}')
            counts[kind] += 1
            if sum(counts.values()) % 100000 == 0:
                print(f'Verified {sum(counts.values())} links', flush=True)

    for kind, expected in counts.items():
        with os.scandir(args.destination / kind) as entries:
            actual = sum(1 for _ in entries)
        if actual != expected:
            raise ValueError(f'{kind}: manifest has {expected} rows, destination has {actual} entries')
    print(f'Verified {counts}; created {created} links. Target contents were not checked.')


if __name__ == '__main__':
    main()
