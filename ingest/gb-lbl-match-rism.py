import argparse
import csv
import json
import os

import rism


def get_mapping(download_directory):
    dir_mapping = {}
    for root, dirs, files in os.walk(download_directory):
        for f in files:
            if f == "manifest.json":
                data = json.load(open(os.path.join(root, f)))
                id = data["@id"]
                dir_mapping[id] = root
    return dir_mapping


def main(download_directory, data_file):
    mapping = get_mapping(download_directory)
    with open(data_file) as fp:
        reader = csv.reader(fp)
        for row in reader:
            rism_id = row[0]
            manifest_url = row[1]
            print(f"{rism_id} - {manifest_url}")
            if manifest_url in mapping:
                print("  Found")
                data_dir = mapping[manifest_url]
                source_url = f"https://rism.online/sources/{rism_id}"
                source = rism.download_source(source_url)
                with open(os.path.join(data_dir, "rism-source.json"), "w") as fp:
                    json.dump(source, fp, indent=2)
            else:
                print("  Not found")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("download_directory")
    parser.add_argument("data_file")

    args = parser.parse_args()

    main(args.download_directory, args.data_file)