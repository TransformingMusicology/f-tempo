import argparse
import json
from pathlib import Path
import pprint

import pysolr

from rism import download_url_jsonld



def main(library, library_directory, solr_core):
    library_parent = Path(library_directory).parent
    library_directory = Path(library_directory)
    all_books = []
    all_people = []
    for i, book in enumerate(library_directory.iterdir(), 1):
        if book.is_dir():
            source = book / "rism-source.json"
            if source.exists():
                with source.open() as fp:
                    source_data = json.load(fp)
                    download_people_for_source(source_data, library_parent)
            bk, people = process_book(library, book, solr_core)
            all_books.append(bk)
            all_people.extend(people)

    add_documents_to_index(solr_core, all_books)
    add_documents_to_index(solr_core, all_people)


def main_single_directory(library, directory, solr_core):
    directory = Path(directory)
    if directory.is_dir():
        source = directory / "rism-source.json"
        bk, people = process_book(library, directory, solr_core)
        pprint.pprint(bk)
        pprint.pprint(people)


def get_value_from_record(records, label, label_lang="en"):
    for record in records:
        if label in record["label"][label_lang]:
            value = record["value"]
            if "en" in value:
                en_val = value["en"]
                if isinstance(en_val, list):
                    return ", ".join(en_val)
                return en_val
            else:
                none_val = value["none"]
                if isinstance(none_val, list):
                    return ", ".join(none_val)
                return none_val
    return None


def get_relationship_from_record(relationships, relationship_id):
    ret = []
    for relationship in relationships:
        if relationship["role"]["id"] == relationship_id:
            ret.append(relationship["relatedTo"])
    return ret



def get_metadata_from_source(rism_source):
    contents = rism_source["contents"]
    summary = contents["summary"]
    title = get_value_from_record(summary, "Standardized title")
    source_title = get_value_from_record(summary, "Title on source")
    source_url = rism_source["id"]
    source_id = source_url.split("/")[-1]

    relationships = rism_source.get("relationships", {}).get("items", [])
    composers = get_relationship_from_record(relationships, "relators:cmp")
    composer_ids = [c["id"].split("/")[-1] for c in composers]
    publishers = get_relationship_from_record(relationships, "relators:pbl")
    # if publisher and publisher["type"] != "rism:Institution":
    #     print(f"Publisher is not an institution for {source_url}")

    material = rism_source.get("materialGroups", {}).get("items")
    if len(material) == 0:
        print(f"No material group for {source_url}")
        place = None
        date = None
    elif len(material) > 1:
        print(f"More than one material group for {source_url}")
    material = material[0]
    place = get_value_from_record(material["summary"], "Place of publication")
    date = get_value_from_record(material["summary"], "Date")

    data = {
        "rism_source_s": str(source_id),
        "title_s": source_title,
        "standardized_title_s": title,
        "place_of_publication_s": place,
        "date_of_publication_s": date,
    }
    if composer_ids:
        data["composer_ss"] = [f"person_{str(composer_id)}" for composer_id in composer_ids]
    if publishers:
        data["publisher_ss"] = [publisher["label"]["none"][0] for publisher in publishers]

    return data


def get_composer_persons_from_source(rism_source):
    relationships = rism_source.get("relationships", {}).get("items", [])
    composers = get_relationship_from_record(relationships, "relators:cmp")
    data = []
    for composer in composers:
        composer_id = composer["id"].split("/")[-1] if composer else None
        data.append({
            "type": "person",
            "id": f"person_{composer_id}",
            "rism_person_id_s": str(composer_id),
            "name_s": composer["label"]["none"][0],
        })
    return data


def get_metadata_gblbl(book_directory):
    """Get the shelfmark from metdata in the manifest"""
    manifest = book_directory / "manifest.json"
    if manifest.exists():
        with manifest.open() as fp:
            manifest_data = json.load(fp)
            for meta in manifest_data["metadata"]:
                if meta["label"] == "Identifier":
                    return {"shelfmark_s": meta["value"]}
    return {}


def process_book(library: str, book_directory: Path, solr_core: str):
    """
    fields for the book:
      plus metadata from rism
      plus metadata from the library
    """

    source = book_directory / "rism-source.json"
    if source.exists():
        with source.open() as fp:
            source_data = json.load(fp)

            fields = {
                "id": f"book_{library}_{book_directory.name}",
                "library_s": library,
                "type": "book",
                "book_id_s": book_directory.name,
            }
            rism_fields = get_metadata_from_source(source_data)
            fields.update(rism_fields)
            library_fields = get_metadata_gblbl(book_directory)
            fields.update(library_fields)

            people = get_composer_persons_from_source(source_data)

            return fields, people

    return {}, {}


def rism_get_composer(source):
    creator = source.get("creator", {})
    role = creator.get("role", {})
    relatedTo = role.get("relatedTo", {})
    if relatedTo and role["id"] == "relators:cre" and relatedTo["type"] == "rism:Person":
        return creator
    return None


def download_people_for_source(source, data_directory):
    rism_people = data_directory / "rism-people"
    rism_people.mkdir(exist_ok=True)
    creator = rism_get_composer(source)
    if creator:
        related_url = creator["relatedTo"]["id"]
        print(f"Downloading {related_url}")
        related_id = related_url.split("/")[-1]
        related_file = rism_people / f"{related_id}.json"
        if not related_file.exists():
            with related_file.open("w") as fp:
                content = download_url_jsonld(related_url)
                if content:
                    json.dump(content, fp, indent=2)


def chunks(l, n):
    for i in range(0, len(l), n):
        yield l[i:i + n]


def add_documents_to_index(solr_url, documents):
    solr = pysolr.Solr(solr_url, always_commit=True)

    for ch in chunks(documents, 1000):
        print("Adding 1000 documents")
        solr.add(ch)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("library_directory", help="")
    parser.add_argument("library")
    parser.add_argument("solr_core")

    args = parser.parse_args()
    #main_single_directory(args.library, args.library_directory, args.solr_core)
    main(args.library, args.library_directory, args.solr_core)