/// <reference types="./types" />
import { get_maws_for_codestrings } from './maw.js';
import {pageToContourList, pageToNoteList, parseMeiFile, parseMeiParts} from "./mei.js";
import nconf from 'nconf';
import workerpool from 'workerpool';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Input } from './import_types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configDir = path.join(__dirname, '..', 'config');

nconf.argv().file(path.join(configDir, 'default_config.json'))
if (process.env.NODE_ENV === "production") {
    nconf.file(path.join(configDir, 'production_config.json'))
}

const meiRoot = nconf.get('config:base_mei_path');

// Only bind the pool if we have >1 threads
if (nconf.get('config:import:threads') !== 1) {
    workerpool.worker({
        doImport: doImport
    });
}

export interface ImportOptions {
    skipMissing?: boolean;
}

export function doImport(param: Input[], opts: ImportOptions = {}) {
    const documents = param.flatMap(item => {
        return makeDocumentsFromFile(item, opts);
    })
    const mawDocuments = addMaws(documents.filter(d => {return d !== undefined}));
    return mawDocuments
}

function makeDocumentsFromFile(item: Input, opts: ImportOptions) {
    const {filePath, id, book, page, notmusic, titlepage, type} = item;

    const parts = id.split("_");
    const library = parts[0];

    const pageDataToSolr = (pageData: Page) => {
        const intervals = pageToContourList(pageData)

        // We use this label when running the maws binary, and it can only accept letters/numbers
        const label = pageData.label ? `_${pageData.label.replaceAll(/[^A-Za-z-_]/g, '_')}` : '';
        // TODO: Type for this
        const data: any = {
            part_number: pageData.partNumber,
            part_name: pageData.label,
            mei_path: pageData.meiPath,
            siglum: id + label,
            id: id + label,
            library: library,
            book: book,
            page_number: page,
            page_data: JSON.stringify(pageData),
            notes: pageToNoteList(pageData).join(' '),
            intervals: intervals.join(' ')
        };
        if (notmusic) {
            data.notmusic = notmusic;
        }
        if (titlepage) {
            data.titlepage = titlepage;
        }
        return data;
    }

    let pageParts: Page[];
    try {
        if (type === 'aruspix') {
            // Aruspix files have just 1 part, so wrap it as a list
            pageParts = [parseMeiFile(meiRoot, filePath)];
        } else if (type === 'mxml') {
            // Files from CPDL/musicxml may have multiple parts
            pageParts = parseMeiParts(meiRoot, filePath);
        } else {
            return [];
        }
    } catch (e: any) {
        // ENOENT comes from fs.readFileSync inside parseMeiFile/parseMeiParts when the MEI is missing on disk.
        if (e?.code === 'ENOENT' && opts.skipMissing) {
            console.warn(`skip missing MEI: ${filePath}`);
            return [];
        }
        throw e;
    }
    return pageParts.map(pageDataToSolr);
}


function addMaws(documents: any[]) {
    const input: {[k: string]: string} = {}
    for (const doc of documents) {
        if (doc.intervals) {
            input[doc.siglum] = doc.intervals.split(' ').join('')
        }
    }
    // maw rejects empty stdin as non-FASTA input, so skip the call when there's nothing to do.
    if (Object.keys(input).length === 0) return documents;
    const mawsOutput = get_maws_for_codestrings(input);

    return documents.map(doc => {
        const maws: any = {}
        if (mawsOutput[doc.siglum] !== undefined) {
            maws['maws'] = mawsOutput[doc.siglum].join(' ')
            maws['nummaws'] = mawsOutput[doc.siglum].length;
        } else if (doc.intervals) {
            // If there's no maws output, but there is an interval string, an error
            console.error(`missing expected maws output for ${doc.siglum}`);
        }
        return {...doc, ...maws};
    });
}
