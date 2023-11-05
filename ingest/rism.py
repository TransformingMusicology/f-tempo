import json
import os
import sys

import requests


def get_next_url_from_results(results):
    return results.get("view", {}).get("next", None)


def get_sources_from_results(results):
    return [item["id"] for item in results.get("items", [])]


def get_sources_for_institution(institution):
    base_url = f"https://rism.online/institutions/{institution}/sources"
    params = {
        "mode": "sources",
        "fq": "has-iiif:true",
        "rows": 100,
    }
    headers = {
        "Accept": "application/ld+json",
        "X-API-Accept-Language": "en",
        "User-Agent": "F-Tempo/Alastair"
    }
    r = requests.get(base_url, params=params, headers=headers, timeout=10)
    r.raise_for_status()
    data = r.json()
    next_url = get_next_url_from_results(data)
    sources = []
    sources.extend(get_sources_from_results(data))
    while next_url:
        print(next_url)
        r = requests.get(next_url, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        next_url = get_next_url_from_results(data)
        sources.extend(get_sources_from_results(data))

    with open("rism-mbs-sources.json", "w") as fp:
        json.dump(sources, fp, indent=2)


def download_individual_sources(start):
    with open("rism-mbs-sources.json") as fp:
        sources = json.load(fp)
    os.makedirs("rism-mbs-sources", exist_ok=True)
    num_sources = len(sources)
    i = start
    while i < num_sources:
        source = sources[i]
        source_id = source.split("/")[-1]
        source_file = os.path.join("rism-mbs-sources", f"{source_id}.json")
        if os.path.exists(source_file):
            print(f"* {i}/{num_sources} - {source}")
            i += 1
            continue
        print(f"{i}/{num_sources} - {source}")
        data = download_source(source)
        with open(source_file, "w") as fp:
            json.dump(data, fp, indent=2)
        i += 1


def download_source(source_url):
    headers = {
        "Accept": "application/ld+json",
        "X-API-Accept-Language": "en",
        "User-Agent": "F-Tempo/Alastair"
    }
    r = requests.get(source_url, headers=headers, timeout=10)
    try:
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        print(f"Error downloading {source_url}")
        return None


def get_mbs():
    get_sources_for_institution("30000882")


if __name__ == '__main__':
    #get_mbs()
    download_individual_sources(int(sys.argv[1]))
