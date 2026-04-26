/// <reference types="../lib/types" />
import yargs from 'yargs'
import util from 'util';
import solr from "solr-client";
import path from "path";
import fs from "fs";
import nconf from 'nconf';
import workerpool from 'workerpool';
import { fileURLToPath } from 'url';
import type { Input } from '../lib/import_types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configDir = path.join(__dirname, '..', 'config');
nconf.argv().file(path.join(configDir, 'default_config.json'))
if (process.env.NODE_ENV === "production") {
    nconf.file(path.join(configDir, 'production_config.json'))
}

const pool = workerpool.pool(
    __dirname + '/../lib/worker.js',
    {maxWorkers: nconf.get('config:import:threads')}
);

const solrClient = solr.createClient(nconf.get('search'));

const argv = yargs(process.argv.slice(2)).usage('Parse MEI files to solr')
    .command({
        command: 'clear',
        describe: 'clear solr database',
        handler: clearSolr
    })
    .command({
        command: 'import <library>',
        describe: 'import data to solr',
        handler: importSolr,
        builder: yargs =>
            yargs.positional('library', {
                description: 'path to library definition file',
                default: undefined
            }).options({
            'saveCache': {
                type: 'boolean',
                description: 'if set, cache the mei data',
                required: false,
                default: false
            },
            'readCache': {
                type: 'boolean',
                description: 'if set, make the index from saved cache data',
                required: false,
                default: false
            },
            'skipMissing': {
                type: 'boolean',
                description: 'continue past MEI files that are missing from disk instead of aborting',
                required: false,
                default: false
            }
        })
    })
    .command({
        command: 'importmei <library>',
        describe: 'import MEI files to solr',
        handler: importMei,
        builder: yargs =>
            yargs.positional('library', {
                description: 'path to library definition file',
                default: undefined
            }).options({
            'skipMissing': {
                type: 'boolean',
                description: 'continue past MEI files that are missing from disk instead of aborting',
                required: false,
                default: false
            }
        })
    })
    .command({
        command: 'debug <file>',
        describe: 'Show generated output for a single file',
        handler: debugFile,
        builder: yargs =>
            yargs.positional('file', {
                description: 'path to file to process',
                default: undefined
            })
    })
    .command({
        command: 'debugmei <file>',
        describe: 'Show generated output for an MEI file',
        handler: debugMeiFile,
        builder: yargs =>
            yargs.positional('file', {
                description: 'path to file to process',
                default: undefined
            })
    })
    .demandCommand()
    .argv;

/**
 * Entrypoint for the `clear` command.
 */
async function clearSolr() {
    await solrClient.deleteAll();
    await solrClient.commit();
}

/**
 * Entrypoint for the `import` command.
 */
async function importSolr(argv: any) {
    if (argv.library) {
        await processLibrary(argv.library, argv.saveCache, argv.readCache, argv.skipMissing);
    } else {
        yargs.showHelp();
    }
}


/**
 * Entrypoint for the `importMei` command.
 */
 async function importMei(argv: any) {
    if (argv.library) {
        await processMeiLibrary(argv.library, argv.skipMissing);
    } else {
        yargs.showHelp();
    }
}


async function processMeiLibrary(librarypath: string, skipMissing: boolean) {
    const data = fs.readFileSync(librarypath, 'utf-8');
    const library = JSON.parse(data);

    const inputList: Input[] = []
    const directory_per_book = library.directory_per_book === true;
    for (const [book_id, book] of Object.entries(library.books)) {
        for (const [page_id, page] of Object.entries((book as any).pages)) {
            const parts = page_id.split("_");
            const libraryCode = parts[0];
            const page2 = (page as any);
            // The library file says if books are in subdirectories
            // Scores are always in an "mei" subdirectory, either in the library dir, or the book dir
            const book_directory = directory_per_book ? book_id : "";
            const filePath = path.join(libraryCode, book_directory, "mei", page2.mei);
            const input: Input = {filePath, library: libraryCode, id: page2.id, book: book_id, page: page2.id, type: 'mxml'}
            inputList.push(input)
        }
    }
    console.log(`got ${inputList.length} items to do`);

    // We assume that we get ~4 parts per MEI file, but we have a limit of 100 items per batch
    // to compute maws, so keep this chunk size quite small
    const opts = {skipMissing};
    const chunk = 10;
    const len = inputList.length;
    for (let i = 0; i < len; i += chunk) {
        const items = inputList.slice(i, i + chunk);
        const {doImport} = await import('../lib/mei_to_solr_worker.js');
        const response = doImport(items, opts);
        await saveToSolr(response);
        if (i % (chunk * 10) === 0) {
            await commit();
        }
        console.log(`${Math.min(i+chunk, len)}/${len}`)
    }
}

/**
 * Entrypoint for the `debug` command.
 */
 async function debugFile(argv: any) {
     console.debug(argv)
     if (argv.file) {
         const {doImport} = await import('../lib/mei_to_solr_worker.js');
         const input: [Input] = [{filePath: argv.file, id: "11_11", book: "11", page: "1", library: "x", type: 'aruspix'}]
         const response = doImport(input);
         console.debug(response);
     }
}

/**
 * Entrypoint for the `debugmei` command.
 */
 async function debugMeiFile(argv: any) {
    console.debug(argv)
    if (argv.file) {

        // const {doImport} = await import('../lib/mei_to_solr_worker.js');
        // const input: [Input] = [{filePath: argv.file, id: "cpdl_bookid_pageid", book: "bookid", page: "pageid", library: "cpdl", type: 'mxml'}]
        // const response = doImport(input);
        // console.debug(response);

        const {parseMeiParts} = await import("../lib/mei.js");
        const parts = parseMeiParts('', argv.file);
        for (const p of parts) {
            console.log(p.label!.replaceAll(/[^A-Za-z-_]/g, '_'));
        }
        console.log(parts);

        // for (const fn of argv._) {
        //     try {
        //         const parts = parseMeiParts(fn);
        //         console.log(fn);
        //         console.log(parts.map(p => p.label).join(", "));
        //     } catch {
        //         console.error(`file ${fn} cannot be read`);
        //     }
        // }

    }
}

/**
 * Process a single library file and import into solr
 *
 * In batches of 100:
 *  - Open MEI
 *  - Extract pitches
 *  - Convert pitches to intervals
 *  - Compute MAWs for the full batch of 1000 items at once.
 *
 * We compute the MAWs in a batch because it's much faster than execing to the maw binary
 * once per file (100 items finishes ~5x faster)
 *
 * Use worker_threads to process batches in parallel. The main implementation of the
 * file processing is performed in mei_to_solr_worker.ts. worker.js is used to
 * launch typescript using ts-node, as worker_threads requires that a worker be js.
 *
 * @param librarypath
 * @param doSaveCache
 * @param readCache
 */
async function processLibrary(librarypath: string, doSaveCache: boolean, readCache: boolean, skipMissing: boolean) {
    const data = fs.readFileSync(librarypath, 'utf-8');
    const library = JSON.parse(data);

    const inputList: Input[] = []
    const directory_per_book = library.directory_per_book === true;
    for (const [book_id, book] of Object.entries(library.books)) {
        for (const [page_id, page] of Object.entries((book as any).pages)) {
            const parts = page_id.split("_");
            const libraryCode = parts[0];
            const page2 = (page as any);
            // The library file says if books are in subdirectories
            // Scores are always in an "mei" subdirectory, either in the library dir, or the book dir
            const book_directory = directory_per_book ? book_id : "";
            const filePath = path.join(libraryCode, book_directory, "mei", page2.mei);
            const input: Input = {
                filePath,
                library: libraryCode,
                id: page2.id,
                book: book_id,
                page: page2.id,
                type: 'aruspix'
            };
            if ((book as any).titlepage) {
                input.titlepage = (book as any).titlepage;
            }
            if (page2.notmusic) {
                input.notmusic = page2.notmusic;
            }
            inputList.push(input)
        }
    }
    console.log(`got ${inputList.length} items to do`);

    // This is the number of items that are sent to the `maw` binary at once. It seems
    // to be buggy when processing 1000 (sometimes it doesn't output data for some inputs)
    // but with 100 it seems fine.
    // TODO: Could add this check to the maw generation instead of adding the limit here
    //  so that we can keep large chunks for solr import but still process maws 100 at a time.
    const chunk = readCache ? 2000 : 100;
    const len = inputList.length;
    // Commit every N batches (so every chunk*N documents)
    const commitEvery = 10;
    const shouldCommitAfter = (batchIndex: number) => (batchIndex + 1) % commitEvery === 0;

    const opts = {skipMissing};
    if (readCache || nconf.get('config:import:threads') === 1) {
        for (let i = 0; i < len; i += chunk) {
            const items = inputList.slice(i, i + chunk);
            const batchIndex = i / chunk;
            let response: any[];
            if (readCache) {
                response = readFromCache(items);
            } else {
                const {doImport} = await import('../lib/mei_to_solr_worker.js');
                response = doImport(items, opts);
            }
            await saveToSolr(response);
            if (shouldCommitAfter(batchIndex)) await commit();
            console.log(`${Math.min(i + chunk, len)}/${len}`);
            if (doSaveCache && !readCache) saveCache(response);
        }
    } else {
        const promises: Promise<void>[] = [];
        for (let i = 0; i < len; i += chunk) {
            const items = inputList.slice(i, i + chunk);
            const batchIndex = i / chunk;
            promises.push(
                pool.exec('doImport', [items, opts]).then(async (resp: any[]) => {
                    await saveToSolr(resp);
                    if (shouldCommitAfter(batchIndex)) await commit();
                    console.log(`${Math.min(i + chunk, len)}/${len}`);
                    if (doSaveCache) saveCache(resp);
                })
            );
        }
        await Promise.all(promises);
        await pool.terminate();
    }
    await commit();
}

/**
 * Load a list of documents to solr
 * @param documents
 */
async function saveToSolr(documents: any[]) {
    const response = await solrClient.add(documents)
    console.log(response);
    return response;
}


async function commit() {
    await solrClient.commit();
}


/**
 * Save a list of documents to a cache file
 * @param documents
 * @param cache
 */
function saveCache(documents: any[]) {
    documents.forEach(doc => {
        const book = doc.book;
        const library = doc.library;

        const dirname = path.join('solr', 'cache', library, book)
        const fpath = path.join(dirname, `${doc.siglum}.json`);
        fs.mkdirSync(dirname, { recursive: true })
        fs.writeFileSync(fpath, JSON.stringify(doc));
    });
}

/**
 * Read json cache files
 * @param files
 */
function readFromCache(files: Input[]) {
    const response: any[] = [];
    // Cache files are named by siglum (id + optional `_label`), but we look
    // them up by input.id, so we have to match `<id>.json` and `<id>_*.json`.
    // Memoise per-book directory listings so we read each dir once.
    const dirListings = new Map<string, string[]>();
    files.forEach(input => {
        const dirname = path.join('solr', 'cache', input.library, input.book);
        let entries = dirListings.get(dirname);
        if (entries === undefined) {
            try {
                entries = fs.readdirSync(dirname);
            } catch {
                entries = [];
            }
            dirListings.set(dirname, entries);
        }
        const exact = `${input.id}.json`;
        const prefix = `${input.id}_`;
        for (const entry of entries) {
            if (entry === exact || (entry.startsWith(prefix) && entry.endsWith('.json'))) {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(dirname, entry), 'utf-8'));
                    response.push(data);
                } catch {
                    //console.error(`Cannot read ${entry}`);
                }
            }
        }
    });
    return response;
}

function pprint(obj: any): string {
    return util.inspect(obj, false, 4, true);
}
