"""Rebuild an experimental CPDL manifest from all files for the seed composers.

Validates XML and the existing per-staff importer's input contract, not musical
correctness or full MEI schema conformance. Source scores/index are never edited.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import unquote
import xml.etree.ElementTree as ET


def local_name(element):
    return element.tag.rsplit('}', 1)[-1]


def score_title(root, path):
    for header in root:
        if local_name(header) != 'meiHead':
            continue
        for statement in header.iter():
            if local_name(statement) != 'titleStmt':
                continue
            for title in statement:
                if local_name(title) == 'title':
                    text = ' '.join(''.join(title.itertext()).split())
                    if text:
                        return text, 'mei_header'
    filename = unquote(path.stem)
    composer = unquote(path.parent.parent.name)
    normalize = lambda s: ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    if normalize(filename).startswith(normalize(composer) + '_'):
        filename = filename[len(composer) + 1:]
    return ' '.join(filename.replace('_', ' ').split()), 'filename'


def inspect_score(path):
    root = ET.parse(path).getroot()
    if local_name(root) != 'mei':
        raise ValueError('Root element is not mei')
    definitions = {}
    warnings = []
    for element in root.iter():
        if local_name(element) != 'staffDef':
            continue
        number = element.get('n')
        if not number or not re.fullmatch(r'[1-9][0-9]*', number):
            raise ValueError(f'Invalid staffDef number: {number!r}')
        labels = [e for e in element.iter() if local_name(e) == 'label']
        label = ' '.join(''.join(labels[0].itertext()).split()) if labels else None
        if number in definitions:
            warnings.append(f'Repeated staffDef {number}; importer uses final definition')
        definitions[number] = label
    if not definitions:
        raise ValueError('No staff definitions')
    notes = Counter()
    for measure in root.iter():
        if local_name(measure) != 'measure':
            continue
        for staff in measure.iter():
            if local_name(staff) != 'staff':
                continue
            number = staff.get('n')
            if number not in definitions:
                raise ValueError(f'Staff {number!r} has no definition')
            for note in staff.iter():
                if local_name(note) != 'note':
                    continue
                if note.get('pname') not in tuple('abcdefg'):
                    raise ValueError(f'Note has invalid pname: {note.get("pname")!r}')
                if not re.fullmatch(r'[0-9]+', note.get('oct', '')):
                    raise ValueError(f'Note has invalid octave: {note.get("oct")!r}')
                notes[number] += 1
    if not sum(notes.values()):
        raise ValueError('No pitched notes in measures')
    labels = [label for label in definitions.values() if label]
    if len(set(labels)) != len(labels):
        warnings.append('Duplicate part labels; numeric part IDs required')
    parts = [dict(number=n, label=label, notes=notes[n]) for n, label in definitions.items()]
    for part in parts:
        if not part['label']:
            warnings.append(f'Staff {part["number"]} has no label')
        if not part['notes']:
            warnings.append(f'Staff {part["number"]} has no pitched notes')
    title, title_source = score_title(root, path)
    return parts, warnings, title, title_source


def reconstruct(seed, scores):
    manifest = dict(directory_per_book=True, book_ids=[], books={})
    audit = dict(included=[], excluded=[], composers={})
    seen = set()
    for composer in sorted(seed['books']):
        if Path(composer).name != composer:
            raise ValueError(f'Invalid composer directory: {composer}')
        actual_composer = composer
        directory = scores / actual_composer / 'mei'
        if not directory.is_dir():
            normalize = lambda s: ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
            matches = [p.name for p in scores.iterdir() if p.is_dir() and normalize(p.name) == normalize(composer)]
            if len(matches) != 1:
                raise FileNotFoundError(f'{directory}; accent-normalized matches: {matches}')
            actual_composer = matches[0]
            directory = scores / actual_composer / 'mei'
        pages = {}
        files = sorted(directory.glob('*.mei'))
        for path in files:
            relative = path.relative_to(scores).as_posix()
            score_id = 'cpdl_' + composer + '_' + hashlib.sha256(relative.encode()).hexdigest()[:16]
            if score_id in seen:
                raise ValueError(f'Duplicate generated ID: {score_id}')
            seen.add(score_id)
            try:
                parts, warnings, title, title_source = inspect_score(path)
            except (ET.ParseError, ValueError) as error:
                audit['excluded'].append(dict(path=relative, reason=str(error)))
                continue
            pages[score_id] = dict(id=score_id, mei=path.name, title=title)
            audit['included'].append(dict(id=score_id, path=relative, title=title, title_source=title_source,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(), parts=parts, warnings=warnings))
        manifest['book_ids'].append(actual_composer)
        manifest['books'][actual_composer] = dict(page_ids=list(pages), pages=pages)
        audit['composers'][composer] = dict(directory=actual_composer, files=len(files), included=len(pages), excluded=len(files)-len(pages))
    audit['totals'] = dict(files=len(seen), included=len(audit['included']),
        excluded=len(audit['excluded']), parts=sum(len(s['parts']) for s in audit['included']))
    return manifest, audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed-index', required=True, type=Path)
    parser.add_argument('--scores', required=True, type=Path, help='CPDL root containing composer directories')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    manifest, audit = reconstruct(json.loads(args.seed_index.read_text()), args.scores)
    browse = dict(directory_per_book=True, book_ids=manifest['book_ids'],
                  books={book:dict(page_ids=[], pages={}) for book in manifest['book_ids']})
    for score in audit['included']:
        book = browse['books'][score['path'].split('/')[0]]
        for part in score['parts']:
            pid = score['id'] + '_part' + part['number']
            book['page_ids'].append(pid)
            book['pages'][pid] = dict(id=pid, mei=Path(score['path']).name, title=score['title'],
                part_number=part['number'], part_name=part['label'], hasmusic=True, notmusic=False)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output/'index-cpdl.json').write_text(json.dumps(manifest, indent=2)+'\n')
    (args.output/'index-cpdl-browse.json').write_text(json.dumps(browse, indent=2)+'\n')
    (args.output/'audit.json').write_text(json.dumps(audit, indent=2)+'\n')
    print(json.dumps(dict(totals=audit['totals'], composers=audit['composers']), indent=2))


if __name__ == '__main__':
    main()
