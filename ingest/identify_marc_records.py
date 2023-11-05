# Take a directory tree created  by parse_iiif.ts with 
# library/book/marc.json
# this file is a list of {id:, value:} dicts.
# Find the unique list of all marc ids over all files


import argparse
import os
import glob
import json


def main(data_directory):
    to_process = []
    for root, dirs, files in os.walk(data_directory):
        for f in files:
            if f == "marc.json":
                to_process.append(os.path.join(root, f))
    
    unique_marc_records = set()
    for f in to_process:
        j = json.load(open(f))
        for record in j:
            unique_marc_records.add(record["id"])

    print(sorted(list(unique_marc_records)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("data_directory")

    args = parser.parse_args()

    main(args.data_directory)
