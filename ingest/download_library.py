import argparse
import concurrent.futures
import csv
import json
import os

import requests
from iiif import get_pages_from_manifest

import rism


def download(url, json=True):
    headers = {
        "User-Agent": "F-Tempo 0.1/ftempo.org (alastair@porter.net.nz)"
    }
    r = requests.get(url, headers=headers, timeout=10)
    try:
        r.raise_for_status()
        if json:
            return r.json()
        else:
            return r.content
    except requests.exceptions.HTTPError as e:
        print(f"Error downloading {url}")


def dmbs_metadata(manifest):
    """Given a manifest file, return an id and a metadata file"""
    manifest_id = manifest["@id"]
    mbs_id = os.path.basename(os.path.dirname(manifest_id))
    seeAlso = manifest["seeAlso"]
    for seeAlsoItem in seeAlso:
        if seeAlsoItem["format"] == "application/rdf+xml":
            item_url = seeAlsoItem["@id"]
            item = download(item_url, json=False)
            return mbs_id, item
    return mbs_id, None


def download_single_page(i, total_pages, images_directory, page):
    page_id = page["id"]
    page_url = page["image"]
    filename = f"{os.path.basename(page_id)}.jpg"
    page_file = os.path.join(images_directory, filename)
    if os.path.exists(page_file):
        print(f"{i}/{total_pages}: Skipping {page_file}")
        return
    print(f"{i}/{total_pages}: Downloading {page_url}")
    page_data = download(page_url, json=False)
    with open(page_file, "wb") as fp:
        fp.write(page_data)


def download_pages(pages, book_directory, threads=1):
    images_directory = os.path.join(book_directory, "images")
    os.makedirs(images_directory, exist_ok=True)
    total_pages = len(pages)
    with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
        for i, page in enumerate(pages, 1):
            executor.submit(download_single_page, i, total_pages, images_directory, page)



def download_item(rism_id, manifest_url, library_id, download_dir, threads):
    print(f"{rism_id} - {manifest_url}")
    manifest = download(manifest_url)
    mbs_id, metadata = dmbs_metadata(manifest)
    book_directory = os.path.join(download_dir, library_id, mbs_id)
    os.makedirs(book_directory, exist_ok=True)
    with open(os.path.join(book_directory, "manifest.json"), "w") as fp:
        json.dump(manifest, fp, indent=2)
    if metadata:
        with open(os.path.join(book_directory, "metadata.xml"), "wb") as fp:
            fp.write(metadata)
    source_url = f"https://rism.online/sources/{rism_id}"
    source = rism.download_source(source_url)
    if source:
        with open(os.path.join(book_directory, "rism-source.json"), "w") as fp:
            json.dump(source, fp, indent=2)

    pages = get_pages_from_manifest(manifest)
    download_pages(pages, book_directory, threads)



def main(data_file, library_id, download_dir, threads):
    library_dir = os.path.join(download_dir, library_id)
    os.makedirs(library_dir, exist_ok=True)
    with open(data_file) as fp:
        reader = csv.reader(fp)
        for row in reader:
            rism_id = row[0]
            manifest_url = row[1]
            download_item(rism_id, manifest_url, library_id, download_dir, threads)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("data_file")
    parser.add_argument("library_id")
    parser.add_argument("download_dir")
    parser.add_argument("-t", "--threads", type=int, default=1)

    args = parser.parse_args()

    main(args.data_file, args.library_id, args.download_dir, args.threads)
