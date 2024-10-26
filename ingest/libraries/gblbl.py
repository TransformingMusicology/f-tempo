import json
import os
from pathlib import Path
import re


def find_marc_record(records, record_type):
    returned_records = []
    for record in records:
        if record["id"] == record_type:
            returned_records.append(record["value"])
    return returned_records


def get_marc_subfield(field, subfield):
    parts = field.split("|")
    for part in parts:
        if part.startswith(f"{subfield} "):
            return part[2:]

def get_all_marc_subfields(field):
    parts = field.split("|")
    subfields = []
    for part in parts:
        if len(part) > 2:
            # TODO: Assumes that we have '|x '
            subfields.append(part[2:])
    return subfields


def get_one_record_subfield(records, record_type, subfield):
    field = find_marc_record(records, record_type)
    if len(field) > 0:
        return get_marc_subfield(field[0], subfield)
    else:
        return None


def get_thumbnail_and_external(manifest_file):
    j = json.load(open(manifest_file))
    thumbnail = None
    external = None
    for m in j["metadata"]:
        if m["label"] == "Catalogue record":
            external = m["value"]
            break
    external_url = re.search(r'(?P<url>https?://[^"]+)', external).group("url")
    thumbnail = j["thumbnail"]["@id"]
    return thumbnail, external_url


def get_solr_document_for_file(input_files, library):
    marc_file = input_files[0]
    manifest_file = input_files[1]
    j = json.load(open(marc_file))
    p = Path(marc_file)

    thumbnail, external = get_thumbnail_and_external(manifest_file)

    document = {}
    document["id"] = p.parent.name
    document["library"] = library
    document["thumbnail"] = thumbnail
    document["external"] = external
    for row in j:
        i = row["id"]
        value = row["value"]
        document[f"marc_{i}"] = document.setdefault(f"marc_{i}", [])
        document[f"marc_{i}"].append(value)

    title_types = ["24500", "24501", "24502", "24503", "24504", "24510", "24512", "24513", "24514"]
    title_record = None
    for t in title_types:
        title_record = find_marc_record(j, t)
        if title_record:
            break
    if title_record:
        title = get_all_marc_subfields(title_record[0])
        document["title"] = " ".join(title)
    publisher = get_one_record_subfield(j, "264 1", "b")
    if publisher:
        document["publisher"] = publisher
    country = get_one_record_subfield(j, "752", "a")
    place = get_one_record_subfield(j, "752", "d")
    country_data = ""
    if place:
        country_data = f"{place}"
    if country_data and country:
        document["place"] = f"{country_data}, {country}"
    elif country:
        document["place"] = country

    description = find_marc_record(j, "500")
    if description:
        document["description"] = [get_all_marc_subfields(d)[0] for d in description]

    reference = find_marc_record(j, "5104")
    if reference:
        rism = None
        for r in reference:
            resource = get_marc_subfield(r, "a")
            if "RISM B/I" in resource:
                rism = get_marc_subfield(r, "c")
        if rism:
            document["rism"] = rism

    shelfmark = find_marc_record(j, "8524")
    if shelfmark:
        shelfmark = get_marc_subfield(shelfmark[0], "j")
        document["shelfmark"] = shelfmark.strip()

    author = get_one_record_subfield(j, "1001", "a")
    if author:
        document["author"] = author.strip(" ,.")

    persons = find_marc_record(j, "7001")
    if persons:
        document["person"] = [get_marc_subfield(p, "a").strip(" ,.") for p in persons]

    names = set()
    if persons:
        names = set([get_marc_subfield(p, "a").strip(" ,.") for p in persons])
    if author:
        names.add(document["author"])
    document["names"] = list(names)

    return document


def get_marc_files(data_directory):
    to_process = []
    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f == "marc.json":
                d = [os.path.join(root, f), os.path.join(root, "manifest.json")]
                to_process.append(d)
    return to_process
