/// <reference types="./types" />
import { get_maws_for_codestrings } from './maw.js';
import {pageToContourList, pageToNoteList, parseMei} from "./mei.js";
import nconf from 'nconf';
import workerpool from 'workerpool';

nconf.argv().file('./config/default_config.json')
if (process.env.NODE_ENV === "production") {
    nconf.file('./config/production_config.json')
}

// Only bind the pool if we have >1 threads
if (nconf.get('config:import:threads') !== 1) {
    workerpool.worker({
        doImport: doImport
    });
}

export function doImport(param: any[]) {
    const documents = param.map(item => {
        return makeDocumentFromFile(item.filePath, item.id, item.book, item.page, false);
    })
    const mawDocuments = addMaws(documents.filter(d => {return d !== undefined}));
    return mawDocuments
}

type MeiCacheData = {page: Page, maws: string[], notes: string[], intervals: string[]}

function makeDocumentFromFile(filePath: string, id: string, book: string, page: string, cache: boolean) {
    let data: MeiCacheData | undefined = undefined;

    const parts = id.split("_");
    const library = parts[0];

    if (data === undefined) {
        try {
            const page = parseMei(filePath);
            const intervals = pageToContourList(page)

            data = {
                intervals: intervals,
                maws: [],
                notes: pageToNoteList(page),
                page: page
            }
        } catch {
            // Probably means the file isn't there
            //console.log(`error reading file ${filePath}`);
            return undefined;
        }
    }

    return {
        siglum: id,
        library: library,
        book: book,
        page_number: page,
        page_data: JSON.stringify(data.page),
        notes: data.notes.join(' '),
        intervals: data.intervals.join(' ')
    };
}


function addMaws(documents: any[]) {
    const input: {[k: string]: string} = {}
    for (const doc of documents) {
        if (doc.intervals) {
            input[doc.siglum] = doc.intervals.split(' ').join('')
        }
    }
    const mawsOutput = get_maws_for_codestrings(input);

    return documents.map(doc => {
        const maws: any = {}
        if (mawsOutput[doc.siglum] !== undefined) {
            maws['maws'] = mawsOutput[doc.siglum].join(' ')
        } else if (mawsOutput[doc.siglum] !== undefined && doc.intervals) {
            // If there's no maws output, but there is an interval string, an error
            console.error(`missing expected maws output for ${doc.siglum}`);
        }
        return {...doc, ...maws};
    });
}