/** Prepare old Aruspix page-based MEI for engraving, without altering note content. */
export function prepareNotation(mei: string, codestring: string) {
    const doc = new DOMParser().parseFromString(mei, 'application/xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'mei') throw new Error('The notation file could not be read.');
    const ns = 'http://www.music-encoding.org/ns/mei';
    const xmlNs = 'http://www.w3.org/XML/1998/namespace';
    const notes = Array.from(doc.getElementsByTagNameNS(ns, 'note'));
    const pitches = notes.map(note => 'CDEFGAB'.indexOf((note.getAttribute('pname') ?? '').toUpperCase()) + 7 * Number(note.getAttribute('oct')));
    const intervals = pitches.slice(1).map((pitch, i) => {
        const delta = pitch - pitches[i];
        const symbol = '-abcdefghijklmnopqrstuvwxyz'[Math.min(26, Math.abs(delta))];
        return delta > 0 ? symbol?.toUpperCase() : symbol;
    }).join('');
    const aligned = notes.length === Array.from(codestring.replace(/\s/g, '')).length + 1 && intervals === codestring.replace(/\s/g, '');
    const noteIds = notes.map((note, i) => {
        const id = note.getAttributeNS(xmlNs, 'id') || `comparison-note-${i}`;
        note.setAttributeNS(xmlNs, 'xml:id', id);
        return id;
    });
    const pages = doc.getElementsByTagNameNS(ns, 'pages')[0];
    if (pages) {
        const make = (tag: string) => doc.createElementNS(ns, tag);
        const score = make('score'), scoreDef = make('scoreDef'), staffGrp = make('staffGrp'), section = make('section');
        const staffNumbers = new Set(Array.from(pages.getElementsByTagNameNS(ns, 'staff')).map(s => s.getAttribute('n') || '1'));
        for (const number of staffNumbers) {
            const staffDef = make('staffDef');
            staffDef.setAttribute('n', number);
            staffDef.setAttribute('lines', '5');
            staffDef.setAttribute('notationtype', 'mensural');
            staffGrp.append(staffDef);
        }
        scoreDef.append(staffGrp);
        for (const system of Array.from(pages.getElementsByTagNameNS(ns, 'system'))) {
            const segment = make('section');
            for (const staff of Array.from(system.children)) {
                if (staff.localName === 'staff') segment.append(staff.cloneNode(true));
            }
            section.append(segment);
        }
        score.append(scoreDef, section);
        pages.replaceWith(score);
        doc.documentElement.setAttribute('meiversion', '5.0');
    }
    return {mei: new XMLSerializer().serializeToString(doc), noteIds, aligned};
}
