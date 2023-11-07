from argparse import ArgumentParser
import json
import os
from urllib.parse import urljoin
import requests


def schema_is_created(base_url, schema_name, test_field):
    """Returns True if the schema is created and has a field defined"""
    url = urljoin(base_url, f"/solr/{schema_name}/schema")
    res = requests.get(url)
    if res.status_code == 404:
        return False
    schema = res.json()
    fields = schema['schema']['fields']
    for f in fields:
        if f['name'] == test_field:
            return True
    return False


def make_schema_request(core_url, schema_req):
    schema_url = f"{core_url}/schema"
    resp = requests.post(schema_url, json=schema_req)
    resp.raise_for_status()


def get_field_types(core_url):
    schema_url = f"{core_url}/schema"
    resp = requests.get(schema_url)
    resp.raise_for_status()
    return resp.json()["schema"]["fieldTypes"]


def add_field_type(core_url, ft, existing_field_types):
    print(f"Creating field type {ft['name']}")
    for existing_ft in existing_field_types:
        if existing_ft["name"] == ft["name"]:
            return
    request = {"add-field-type": ft}
    make_schema_request(core_url, request)


def add_field(core_url, field):
    request = {"add-field": field}
    print(f"Creating field {field['name']} with type {field['type']}")
    make_schema_request(core_url, request)


def add_dynamic_field(core_url, field):
    request = {"add-dynamic-field": field}
    print(f"Creating dynamic field {field['name']} with type {field['type']}")
    make_schema_request(core_url, request)


def create_copyfield(core_url, cf):
    request = {"add-copy-field": {"source": cf["source"], "dest": cf["dest"]}}
    print(f"Creating copyfield from {cf['source']}-{cf['dest']}")
    make_schema_request(core_url, request)


def create_schemas(schema_directory, solr_base_url):
    for schema in ["ftempo", "ftempo-meta"]:
        schema_definition = json.load(open(os.path.join(schema_directory, f"{schema}.json")))
        test_field_name = schema_definition["fields"][0]["name"]
        if schema_is_created(solr_base_url, schema, test_field_name):
            print(f"Schema {schema} is already created")
        else:
            print(f"No schema for {schema}, creating...")
            core_url = urljoin(solr_base_url, f"/solr/{schema}")
            print("field types")
            existing_field_types = get_field_types(core_url)
            for ft in schema_definition.get("fieldTypes", []):
                add_field_type(core_url, ft, existing_field_types)
            print("fields")
            for field in schema_definition["fields"]:
                add_field(core_url, field)
            for dynamic in schema_definition.get("dynamicFields", []):
                add_dynamic_field(core_url, dynamic)
            print("copyfields")
            for cf in schema_definition.get("copyFields", []):
                create_copyfield(core_url, cf)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("schema_directory")
    parser.add_argument("solr_base_url")
    args = parser.parse_args()

    create_schemas(args.schema_directory, args.solr_base_url)
