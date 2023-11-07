import csv
import sys

def main():
    fp = open(sys.argv[1])
    reader = csv.reader(fp)
    current_manifest = None
    for line in reader:
        metadata_id = line[0]
        rism_id = line[2]
        manifest = line[4]
        if metadata_id:
            current_manifest = manifest
        elif rism_id and rism_id != "not_found":
            print(f"{rism_id},{current_manifest}")

if __name__ == "__main__":
    main()
