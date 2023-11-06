/// <reference types="../lib/types" />
import yargs from 'yargs';
import util from 'util';
import fs from "fs";
import nconf from 'nconf';
import {bl_marc, bl_metadata} from "../lib/library/gblbl.js";
import {downloadAndSaveImage, getMetaFieldFromMetadata} from "../lib/library/iiifUtils.js";
import path from "path";

nconf.argv().file('./config/default_config.json');
if (process.env.NODE_ENV === "production") {
    nconf.file('./config/production_config.json');
}

const argv = yargs(process.argv.slice(2)).usage('Parse an IIIF manifest and import into solr')
    .command({
        command: 'import <file> <data> <library>',
        describe: 'read an iiif manifest',
        handler: importIiif,
        builder: yargs =>
            yargs.positional('file', {
                description: 'path to an IIIF file',
                default: undefined
            }).positional('data', {
                description: 'Location to save data',
                default: undefined
            }).positional('library', {
                description: 'Name of the library',
                default: undefined
            })
    }).command({
        command: 'list <file>',
        describe: 'list URLs in an iiif manifest',
        handler: listIiif,
        builder: yargs =>
            yargs.positional('file', {
                description: 'path to an IIIF file',
                default: undefined
            })
    })
    .demandCommand()
    .argv;

/**
 * Entrypoint for the `import` command.
 */
async function importIiif(argv: any) {
    if (argv.file && argv.data && argv.library) {
        await processIiifManifest(argv.file, argv.library, argv.data);
    } else {
        argv.showHelp();
    }
}


/**
 * `list` function
 */
async function listIiif(argv: any) {
    if (argv.file) {
        //await listIiifManifest(argv.file);
    } else {
        argv.showHelp();
    }
}

function getPagesFromManifest(manifest: any) {
    // TODO: As the IIIF manifest is JSON-LD, we could parse this with a JSON-LD parser.
    //  error checking for missing images isn't in place
    //  There is no checking if the image is a dctypes:Image, or the format is image/jpg
    const pages = [];
    for (const sequence of manifest.sequences) {
        for (const canvas of sequence.canvases) {
            const page = {
                id: canvas['@id'],
                label: canvas.label,
                image: canvas.images[0].resource['@id'],
            };
            pages.push(page);
        }
    }
    return pages;
}

async function processIiifManifest(manifestPath: string, libraryName: string, dataPath: string) {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    const library = JSON.parse(data);

    const metadata = bl_metadata(library);

    const catalogue_record = getMetaFieldFromMetadata(library.metadata, "Catalogue record");
    console.log(`Catalogue record: ${catalogue_record}`)
    if (catalogue_record) {
        const match = catalogue_record.match("docId=BLL01([0-9]+)");
        if (match) {
            const catalogueId = match[1];
            console.log(`Catalogue ID: ${catalogueId}`);
            const directory = path.join(dataPath, libraryName, catalogueId);
            if (!fs.existsSync(path.join(directory, 'metadata.json'))) {
                const marc = await bl_marc(catalogueId);
                console.log(pprint(marc));
                const pages = getPagesFromManifest(library);
                const totalPages = pages.length;
                console.log(` ${totalPages} pages`);

                fs.mkdirSync(directory, {recursive: true});
                fs.mkdirSync(path.join(directory, 'images'), {recursive: true});
                fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(library, null, 2));
                fs.writeFileSync(path.join(directory, 'metadata.json'), JSON.stringify(metadata, null, 2));
                fs.writeFileSync(path.join(directory, 'marc.json'), JSON.stringify(marc, null, 2));
            
                let i = 1;
                for (const page of pages) {
                    console.log(`Downloading ${i}/${totalPages} ${page.id}`);
                    const imagePath = path.join(directory, 'images', `${page.label.padStart(4, 0)}.jpg`);
                    if (fs.existsSync(imagePath)) {
                        console.log(` ...already exists, skipping`);
                    } else {
                        await downloadAndSaveImage(page.image, imagePath);
                    }
                    i++;
                }
            }
        }
    } else {
        console.log("No catalogue record found");
    }
}

function pprint(obj: any): string {
    return util.inspect(obj, false, 4, true);
}
