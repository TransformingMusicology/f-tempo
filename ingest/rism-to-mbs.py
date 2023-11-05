import collections
import csv
import json
import os
import sys
import xml.etree.ElementTree as ET


def get_manifests_from_rism(rism):
    manifests = []
    for item in rism.get("exemplars", {}).get("items", []):
        externals = item.get("externalResources", {}).get("items", [])
        for e in externals:
            if e.get("type") == "rism:ExternalResource" and e.get("resourceType") == "rism:IIIFManifestLink":
                manifests.append(e.get("url"))
    return manifests


def get_source_from_rism(rism):
    return rism["id"]


def main(manifest_dir, rism_dir):
    manifest_to_metadata = get_manifest_to_metadata(manifest_dir, rism_dir)

    mbs_manifest_urls = set()
    for root, dirs, files in os.walk(manifest_dir):
        for f in files:
            if f == "manifest.json":
                d = json.load(open(os.path.join(root, f)))
                mbs_manifest_urls.add(d['@id'])

    rism_files = {}
    found_manifests = set()
    for root, dirs, files in os.walk(rism_dir):
        for f in files:
            if f.endswith(".json"):
                d = json.load(open(os.path.join(root, f)))
                if "partOf" not in d:
                    manifests = get_manifests_from_rism(d)
                    source_id = get_source_from_rism(d)
                    for m in manifests:
                        if m in mbs_manifest_urls:
                            found_manifests.add(m)
                            if m in rism_files:
                                print(f"Duplicate manifest {m} in {rism_files[m]} and {source_id}")
                            rism_files[m] = source_id

    print(f"Found {len(rism_files)} RISM files that are also in MBS")
    # for m, f in rism_files.items():
    #     print(f"{f},{m}")

    header = ["manifest", "viewer", "rism_source", "mbs_rism_id", "mbs_title"]
    with open("f-temppo-rism-d-mbs.csv", "w") as fp:
        w = csv.DictWriter(fp, fieldnames=header)
        w.writeheader()
        for m, f in rism_files.items():
            rism, title, dirname = manifest_to_metadata[m]
            w.writerow({
                "manifest": m,
                "viewer": f"https://rism.online/viewer.html#?manifest={m}",
                "rism_source": f,
                "mbs_rism_id": rism,
                "mbs_title": title
            })

        missing = mbs_manifest_urls - found_manifests
        for manifest in missing:
            rism, title, dirname = manifest_to_metadata[manifest]
            w.writerow({
                "manifest": manifest,
                "viewer": f"https://rism.online/viewer.html#?manifest={m}",
                "rism_source": "",
                "mbs_rism_id": rism,
                "mbs_title": title
            })


def main2(x, rism_dir):
    url = "https://api.digitale-sammlungen.de/iiif/presentation/v2/bsb00082650/manifest"
    for root, dirs, files in os.walk(rism_dir):
        for f in files:
            if f.endswith(".json"):
                d = json.load(open(os.path.join(root, f)))
                manifests = get_manifests_from_rism(d)
                for m in manifests:
                    if m == url:
                        print(d["id"])


def get_rism_description(metadata_path):
    document = ET.parse(metadata_path)
    descriptions = document.findall(".//{http://purl.org/dc/terms/}description")
    rism_descriptions = [d.text for d in descriptions if d.text.startswith("Bibliogr Nachweis: RISM")]
    if len(rism_descriptions) == 1:
        rism = rism_descriptions[0]
    else:
        rism = None
    title = document.find(".//{http://purl.org/dc/elements/1.1/}title").text
    return rism, title


def get_manifest_to_metadata(manifest_dir, rism_dir):
    manifest_to_metadata = {}
    for root, dirs, files in os.walk(manifest_dir):
        manifest = None
        rism = None
        title = None
        for f in files:
            if f == "manifest.json":
                d = json.load(open(os.path.join(root, f)))
                manifest = d['@id']
            if f == "metadata.rdf":
                rism, title = get_rism_description(os.path.join(root, f))
        if manifest:
            manifest_to_metadata[manifest] = (rism, title, root.split("/")[-1])
        else:
            print(f"Missing manifest or RISM for {root}")

    with open("d-mbs-manifest-to-metadata.json", "w") as fp:
        json.dump(manifest_to_metadata, fp, indent=2)
    return manifest_to_metadata


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
