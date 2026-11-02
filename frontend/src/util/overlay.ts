/** Preserve the Aruspix page layout and index notes in the same order as the server. */
export function prepareOverlay(mei: string) {
    const doc = new DOMParser().parseFromString(mei, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid MEI');
    const xml = 'http://www.w3.org/XML/1998/namespace';
    const notes = Array.from(doc.getElementsByTagName('system')).flatMap(s => Array.from(s.getElementsByTagName('note')));
    const noteIds = notes.map((note, i) => {
        const id = note.getAttributeNS(xml, 'id') || `overlay-note-${i}`;
        note.setAttributeNS(xml, 'xml:id', id);
        return id;
    });
    const pitches = notes.map(n => 'CDEFGAB'.indexOf((n.getAttribute('pname') ?? '').toUpperCase()) + 7 * Number(n.getAttribute('oct')));
    const codestring = pitches.slice(1).map((pitch, i) => {
        const delta = pitch - pitches[i]!;
        const symbol = '-abcdefghijklmnopqrstuvwxyz'[Math.min(26, Math.abs(delta))]!;
        return delta > 0 ? symbol.toUpperCase() : symbol;
    }).join('');
    return {mei: new XMLSerializer().serializeToString(doc), noteIds, codestring};
}
