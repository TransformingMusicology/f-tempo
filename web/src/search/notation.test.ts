import {expect, it} from 'vitest';
import {prepareNotation} from './notation';

const mei = `<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="2013"><music><body><mdiv><pages><page><system><staff n="1"><layer n="1"><clef shape="C" line="1"/><note xml:id="a" pname="c" oct="4" dur="minima"/><note xml:id="b" pname="d" oct="4" dur="semibrevis"/></layer></staff></system><system><staff n="1"><layer n="1"><note xml:id="c" pname="e" oct="4" dur="minima"/></layer></staff></system></page></pages></mdiv></body></music></mei>`;

it('converts page-based notation while retaining note IDs, order and durations', () => {
    const result = prepareNotation(mei, 'AA');
    expect(result.aligned).toBe(true);
    expect(result.noteIds).toEqual(['a', 'b', 'c']);
    const doc = new DOMParser().parseFromString(result.mei, 'application/xml');
    expect(doc.querySelector('pages')).toBeNull();
    expect(doc.querySelector('scoreDef staffDef')?.getAttribute('notationtype')).toBe('mensural');
    expect(Array.from(doc.querySelectorAll('note')).map(n => n.getAttribute('dur'))).toEqual(['minima', 'semibrevis', 'minima']);
    expect(doc.querySelector('clef')?.getAttribute('shape')).toBe('C');
});

it('disables highlighting if pitches disagree with the indexed intervals', () => {
    expect(prepareNotation(mei, 'AB').aligned).toBe(false);
});

it('rejects a missing or malformed notation response', () => {
    expect(() => prepareNotation('Not found', 'AA')).toThrow('could not be read');
});
