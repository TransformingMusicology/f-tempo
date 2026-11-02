// @vitest-environment jsdom
import {expect, it} from 'vitest';
import {prepareOverlay} from './overlay';

it('keeps note IDs and scan coordinates while reproducing indexed intervals across systems', () => {
    const mei = '<mei><music><pages><page page.width="1000"><system><note xml:id="a" pname="c" oct="4" ulx="42"/><note xml:id="b" pname="d" oct="4"/></system><system><note xml:id="c" pname="c" oct="4"/></system></page></pages></music></mei>';
    const result = prepareOverlay(mei);
    expect(result.noteIds).toEqual(['a', 'b', 'c']);
    expect(result.codestring).toBe('Aa');
    expect(result.mei).toContain('ulx="42"');
    expect(result.mei).toContain('page.width="1000"');
});
