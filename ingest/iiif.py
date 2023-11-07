def get_pages_from_manifest(manifest):
    # TODO: As the IIIF manifest is JSON-LD, we could parse this with a JSON-LD parser.
    # Error checking for missing images isn't in place.
    # There is no checking if the image is a dctypes:Image or the format is image/jpg.

    pages = []

    for sequence in manifest['sequences']:
        for canvas in sequence['canvases']:
            page = {
                'id': canvas['@id'],
                'label': canvas.get('label'),
                'image': canvas['images'][0]['resource']['@id'],
            }
            pages.append(page)

    return pages
