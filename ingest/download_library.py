import argparse
import csv

import rism


def dbsb_metadata(manifest):
    pass


def download_manifest_items():
    pass


def download_item(rism_id, manifest_url, library_id, download_dir):
    print(f"{rism_id} - {manifest_url}")


def download_manifest(manifest_url, library_id, download_dir):

    pass


def download_rism(rism_id, library_id, download_dir):
    source = rism.download_source(rism_id)


def main(data_file, library_id, download_dir):
    with open(data_file) as fp:
        reader = csv.reader(fp)
        for row in reader:
            rism_id = row[0]
            manifest_url = row[1]
            download_item(rism_id, manifest_url, library_id, download_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("data_file")
    parser.add_argument("library_id")
    parser.add_argument("download_dir")

    args = parser.parse_args()

    main(args.data_file, args.library_id, args.download_dir)
