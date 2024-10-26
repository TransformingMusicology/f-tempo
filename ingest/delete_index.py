import argparse

import pysolr

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("solr_core")

    args = parser.parse_args()
    solr = pysolr.Solr(args.solr_core, always_commit=True)

    solr.delete(q="*:*", commit=True)
