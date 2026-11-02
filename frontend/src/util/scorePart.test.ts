// @vitest-environment jsdom
import {expect, it} from 'vitest';
import {prepareScorePart} from './scorePart';

const mei = '<mei><music><score><scoreDef><staffGrp><staffDef n="1"/><staffDef n="2"/></staffGrp></scoreDef><section><measure><staff n="1"><layer><note xml:id="a" pname="c" oct="4"/></layer></staff><staff n="2"><layer><note xml:id="b" pname="g" oct="3"/></layer></staff></measure><measure><staff n="1"><layer><note xml:id="c" pname="d" oct="4"/></layer></staff><staff n="2"><layer><note xml:id="d" pname="f" oct="3"/></layer></staff><dynam staff="1">p</dynam></measure></section></score></music></mei>';

it('maps only the indexed voice while retaining the complete score', () => {
    const result = prepareScorePart(mei, '2', false);
    expect(result.noteIds).toEqual(['b', 'd']);
    expect(result.codestring).toBe('a');
    expect(result.mei).toContain('xml:id="a"');
});

it('isolates a voice without renumbering its staff or source notes', () => {
    const result = prepareScorePart(mei, '2', true);
    const doc = new DOMParser().parseFromString(result.mei, 'application/xml');
    expect(Array.from(doc.getElementsByTagName('staff')).map(s => s.getAttribute('n'))).toEqual(['2', '2']);
    expect(doc.getElementsByTagName('staffDef').length).toBe(1);
    expect(doc.getElementsByTagName('dynam').length).toBe(0);
    expect(result.noteIds).toEqual(['b', 'd']);
});

it('rejects a missing voice instead of highlighting another part', () => {
    expect(() => prepareScorePart(mei, '3', false)).toThrow('indexed voice');
});

it('removes empty nested practice groups when extracting an inner voice', () => {
    const grouped = mei.replace('<staffDef n="1"/><staffDef n="2"/>', '<staffGrp><staffDef n="1"/><staffDef n="2"/></staffGrp><staffGrp><label>Practice</label><staffDef n="5"/><staffDef n="6"/></staffGrp>');
    const doc = new DOMParser().parseFromString(prepareScorePart(grouped, '2', true).mei, 'application/xml');
    const groups = Array.from(doc.getElementsByTagName('staffGrp'));
    expect(groups.length).toBe(2);
    expect(groups.every(g => g.getElementsByTagName('staffDef').length > 0)).toBe(true);
    expect(doc.getElementsByTagName('label').length).toBe(0);
});
