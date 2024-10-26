import argparse
import dataclasses
import json
from pathlib import Path
import re

from maws import get_maws_for_codestrings

import mei

def page_data_to_solr(page_data, id, library, book, page, notmusic=None, titlepage=None):
    intervals = mei.page_to_contour_list(page_data)

    # We use this label when running the maws binary, and it can only accept letters/numbers
    label = f"_{re.sub('[^A-Za-z-_]', '_', page_data.label)}" if page_data.label else ''

    data = {
        "part_number": page_data.part_number,
        "part_name": page_data.label,
        "mei_path": page_data.mei_path,
        "siglum": f"{id}{label}",
        "id": f"{id}{label}",
        "library": library,
        "book": book,
        "page_number": page,
        "page_data": json.dumps(dataclasses.asdict(page_data)),
        "notes": ' '.join(mei.page_to_note_list(page_data)),
        "intervals": ' '.join(intervals)
    }

    if notmusic is not None:
        data["notmusic"] = notmusic

    if titlepage is not None:
        data["titlepage"] = titlepage

    return data


def process_mei_file(library, mei_file, solr_core):
    print(mei_file)
    x = mei.parse_mei_file(mei_file.parent, mei_file.name)
    data = page_data_to_solr(x, "id", "library", "book", "page")
    codestrings = {"x": "".join(data["intervals"].split())}
    maws = get_maws_for_codestrings(codestrings)
    print(maws)
    print(data)


def main(library, library_directory, solr_core):
    library_parent = Path(library_directory).parent
    library_directory = Path(library_directory)
    all_books = []
    all_people = []
    for i, book in enumerate(library_directory.iterdir(), 1):
        if book.is_dir():
            mei_dir = book / "mei"
            if mei_dir.exists():
                for mei_file in mei_dir.iterdir():
                    if mei_file.suffix == ".mei":
                        process_mei_file(library, mei_file, solr_core)
                        break
        break



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("library_directory", help="")
    parser.add_argument("library")
    parser.add_argument("solr_core")

    args = parser.parse_args()
    main(args.library, args.library_directory, args.solr_core)