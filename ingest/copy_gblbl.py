import argparse
import json
import os
from pathlib import Path
import pprint
import re
import shutil

import pysolr

from rism import download_url_jsonld



def main(download_directory, index_file):
    index = json.load(open(index_file))
    library_dir = Path(download_directory)
    for i, book in enumerate(library_dir.iterdir(), 1):
        if book.is_dir():
            process_book("GB-Lbl", book, index)


def get_metadata_gblbl(book_directory):
    """Get the shelfmark from metdata in the manifest"""
    manifest = book_directory / "manifest.json"
    if manifest.exists():
        with manifest.open() as fp:
            manifest_data = json.load(fp)
            manifest_url = manifest_data["@id"]
            shelfmark = None
            cat = None
            for meta in manifest_data["metadata"]:
                if meta["label"] == "Identifier":
                    shelfmark = meta["value"]
                elif meta["label"] == "Catalogue record":
                    match = re.search(r'href="([^"]*)"', meta["value"])
                    if match:
                        cat = match.group(1)
            data = {"manifest_s": manifest_url}
            if shelfmark:
                data["shelfmark_s"] = shelfmark
            if cat:
                data["catalogue_record_s"] = cat
            return data
    return {}


def process_book(library: str, book_directory: Path, index):
    if not os.path.exists(book_directory / "rism-source.json"):
        return
    fields = {
        "id": f"book_{library}_{book_directory.name}",
        "library_s": library,
        "type": "book",
        "book_id_s": book_directory.name,
    }
    books_keys = index["books"].keys()
    library_fields = get_metadata_gblbl(book_directory)
    fields.update(library_fields)
    fields['directory_name_s'] = book_directory.name
    shelfmark = fields.get("shelfmark_s")
    if shelfmark:
        shelfmark = shelfmark.replace("Digital Store ", "").replace(".", "")
        if "(" in shelfmark:
            #remove all content in parens
            shelfmark = re.sub(r'\([^)]*\)', '', shelfmark)
        if shelfmark in books_keys:
            new_book_directory = book_directory.parent.parent / "GB-Lbl-oldid" / shelfmark
            new_book_directory.mkdir(exist_ok=True, parents=True)
            new_mei = new_book_directory / "mei"
            new_mei.mkdir(exist_ok=True, parents=True)
            new_images = new_book_directory / "images"
            new_images.mkdir(exist_ok=True, parents=True)
            pages = index["books"][shelfmark]["pages"]
            shutil.copy(book_directory / "manifest.json", new_book_directory)
            shutil.copy(book_directory / "rism-source.json", new_book_directory)
            shutil.copy(book_directory / "metadata.json", new_book_directory)

            for id, p in pages.items():
                jpg = ".." + p["jpg"]
                mei = p["mei"]
                mei_root = "../storage/scores/GB-Lbl/"
                shutil.copy(mei_root + mei, new_mei)
                shutil.copy(jpg, new_images)

            x = "  *YES"
        else:
            x = "  *NO"
        print(book_directory.name, shelfmark, x)

    return fields


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("download_directory", help="")
    parser.add_argument("index_file")

    args = parser.parse_args()
    main(args.download_directory, args.index_file)
