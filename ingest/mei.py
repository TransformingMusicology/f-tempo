import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List

nsmap = {"mei": "http://www.music-encoding.org/ns/mei"}

@dataclass
class Page:
    meiPath: str
    width: str
    height: str
    systems: List['System']

@dataclass
class System:
    id: str
    notes: List['Note']
    y: str

@dataclass
class Note:
    p: str
    o: str
    id: str
    x: str

def parse_mei_parts(mei_root, filename):
    full_filename = os.path.join(mei_root, filename)
    tree = ET.parse(full_filename)
    root = tree.getroot()

    staffs = {}

    for sd in root.findall(".//mei:staffDef", nsmap):
        label = sd.find(".//mei:label", nsmap)
        staff_label = label.text.strip().replace(" ", " ")
        n = sd.get("n")
        staffs[n] = {
            "label": staff_label,
            "partNumber": n,
            "meiPath": filename,
            "systems": [{"id": f"system-{n}", "notes": []}],
        }

    measures = root.findall(".//mei:measure", nsmap)

    for measure in measures:
        measure_staffs = measure.findall(".//mei:staff", nsmap)
        for staff in measure_staffs:
            measure_staff_id = staff.get("n")
            notes = staff.findall(".//mei:note", nsmap)
            for note in notes:
                nattrs = note.attrib
                p = nattrs.get("pname")
                o = nattrs.get("oct")
                id = nattrs.get("xml:id")
                staffs[measure_staff_id]["systems"][0]["notes"].append({"id": id, "p": p, "o": o})

    return list(staffs.values())

def parse_mei_file(mei_root, filename):
    root = ET.parse(os.path.join(mei_root, filename)).getroot()
    return parse_mei_document(root, filename)

def parse_mei_document(document, filename):
    systems = []

    for system in document.findall(".//mei:system", nsmap):
        sys_attrs = system.attrib
        system_id = sys_attrs.get("xml:id")
        note_elements = system.findall(".//mei:note", nsmap)
        notes = []

        for note in note_elements:
            n_attrs = note.attrib
            p = n_attrs.get("pname")
            o = n_attrs.get("oct")
            id = n_attrs.get("xml:id")
            x = n_attrs.get("ulx")
            notes.append(Note(p, o, id, x))

        y = sys_attrs.get("uly")
        systems.append(System(system_id, notes, y))

    page_elements = document.findall(".//mei:page", nsmap)
    if len(page_elements) > 1:
        raise ValueError("Can't deal with more than 1 page")

    page_attrs = page_elements[0].attrib
    mei_path = filename
    width = page_attrs.get("page.width")
    height = page_attrs.get("page.height")

    return Page(mei_path, width, height, systems)

def page_to_note_list(page):
    notes = [note.p + note.o for system in page.systems for note in system.notes]
    return notes

def page_to_contour_list(page):
    notes = [note for system in page.systems for note in system.notes]
    return pitches_to_interval_mapping(notes)

def notes_to_contour(notes, chunk_size=None):
    if chunk_size is None:
        chunk_size = 4
    n_grams = []

    for i in range(len(notes) - chunk_size + 1):
        part = notes[i:i + chunk_size]
        contour = pitches_to_interval_mapping(part)
        n_gram = {"contour": contour, "notes": part, "sequence": i}
        n_grams.append(n_gram)

    return n_grams

def pitches_to_interval_mapping(pitches):
    interval_mapping = "-abcdefghijklmnopqrstuvwxyz"

    alphabet = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

    pitch_nums = [alphabet.index(note.p.upper()) + (7 * int(note.o)) for note in pitches]

    pitch_intervals = [pitch_nums[i + 1] - pitch_nums[i] for i in range(len(pitch_nums) - 1)]

    def clamp(i):
        if i < -26:
            return -26
        if i > 26:
            return 26
        return i

    pitch_intervals = [interval_mapping[abs(clamp(i))] for i in pitch_intervals]
    pitch_intervals = [i.upper() if i > 'a' else i for i in pitch_intervals]

    return pitch_intervals


def parse_mei(document):
    staff_definitions = document.findall(".//mei:staffDef", nsmap)
    staffs = {}
    for sd in staff_definitions:
        attributes = sd.attrib
        label = sd.find(".//mei:label", nsmap)
        staff_label = label.text if label is not None else None
        if "n" in attributes:
            staffs[attributes["n"]] = {"label": staff_label, "notes": []}

    measures = document.findall(".//mei:measure", nsmap)
    for measure in measures:
        measure_staffs = measure.findall(".//mei:staff", nsmap)
        for staff in measure_staffs:
            measure_staff_id = staff.get("n")
            notes = staff.findall(".//mei:note", nsmap)
            for note in notes:
                nattrs = note.attrib
                staffs[measure_staff_id]["notes"].append({"pitch": nattrs["pname"], "oct": int(nattrs["oct"])})

    for key in staffs:
        staffs[key]["notes"] = pitches_to_interval_mapping(staffs[key]["notes"])
    
    return staffs
