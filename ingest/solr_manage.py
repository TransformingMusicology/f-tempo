import json
from argparse import ArgumentParser
from pathlib import Path

import pysolr
from service import solrapi


def create_schemas(solr_base_url):
    schema_directory = Path(__file__).parent / "schema"
    with open(schema_directory / "delete_default_fields.json", "r") as f:
        delete_default_fields = json.load(f)
    for collection_name, schema_file in [("ftempo", "ftempo.json"), ("ftempo-meta", "ftempo-meta.json")]:
        with open(schema_directory / schema_file, "r") as f:
            schema = json.load(f)
        api = solrapi.SolrManagementAPI(solr_base_url, collection_name)
        api.create_collection_and_schema(delete_default_fields, schema, "book")


def delete_data(solr_collection_url):
    solr = pysolr.Solr(solr_collection_url)
    solr.delete(q="*:*", commit=True)


if __name__ == "__main__":
    parser = ArgumentParser()
    subparser = parser.add_subparsers(dest="command")
    create = subparser.add_parser("create", help="Create a new collection and update the schema")
    delete = subparser.add_parser("delete_data", help="Delete all data from a collection")

    create.add_argument("solr_base_url")
    create.add_argument("schema_directory")
    delete.add_argument("solr_collection_url")
    args = parser.parse_args()

    if args.command == "create":
        create_schemas(args.solr_base_url)
    elif args.command == "delete_data":
        delete_data(args.solr_collection_url)
    else:
        parser.print_help()
