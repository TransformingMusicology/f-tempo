/** Preserve source note IDs and the importer's measure/staff note order. */
export function prepareScorePart(mei: string, staffNumber: string, onlyPart: boolean) {
    const doc = new DOMParser().parseFromString(mei, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid MEI');
    const staffs = Array.from(doc.getElementsByTagName('staff'));
    const selected = staffs.filter(staff => staff.getAttribute('n') === staffNumber);
    if (!selected.length) throw new Error('The indexed voice is missing from this score');
    const notes = selected.flatMap(staff => Array.from(staff.getElementsByTagName('note')));
    const xml = 'http://www.w3.org/XML/1998/namespace';
    const staffIds = selected.map((staff, i) => {
        const id = staff.getAttributeNS(xml, 'id') || `cpdl-staff-${staffNumber}-${i}`;
        staff.setAttributeNS(xml, 'xml:id', id);
        return id;
    });
    const noteIds = notes.map((note, i) => {
        const id = note.getAttributeNS(xml, 'id') || `cpdl-part-${staffNumber}-note-${i}`;
        note.setAttributeNS(xml, 'xml:id', id);
        return id;
    });
    const pitches = notes.map(n => 'CDEFGAB'.indexOf((n.getAttribute('pname') ?? '').toUpperCase()) + 7 * Number(n.getAttribute('oct')));
    const codestring = pitches.slice(1).map((pitch, i) => {
        const delta = pitch - pitches[i]!;
        const symbol = '-abcdefghijklmnopqrstuvwxyz'[Math.min(26, Math.abs(delta))]!;
        return delta > 0 ? symbol.toUpperCase() : symbol;
    }).join('');
    if (onlyPart) {
        staffs.filter(staff => staff.getAttribute('n') !== staffNumber).forEach(staff => staff.remove());
        Array.from(doc.getElementsByTagName('staffDef')).filter(staff => staff.getAttribute('n') !== staffNumber).forEach(staff => staff.remove());
        Array.from(doc.getElementsByTagName('staffGrp')).reverse().forEach(group => {
            if (!group.getElementsByTagName('staffDef').length) group.remove();
        });
        // Control events can explicitly refer to removed staves.
        Array.from(doc.querySelectorAll('[staff]')).forEach(el => {
            if (!el.getAttribute('staff')!.split(/\s+/).includes(staffNumber)) el.remove();
            else el.setAttribute('staff', staffNumber);
        });
    }
    return {mei: new XMLSerializer().serializeToString(doc), noteIds, staffIds, codestring};
}
