/// <reference types="../types" />
import {JSDOM} from 'jsdom';
import {getMetaFieldFromMetadata} from "./iiifUtils.js";

const dom = new JSDOM("");
const DOMParser = dom.window.DOMParser;


/**
 * Extract useful metadata from the BL catalogue record.
 * @param document
 */
export function bl_metadata(document: any) {
    const identifier = getMetaFieldFromMetadata(document.metadata, "Identifier");
    const title = getMetaFieldFromMetadata(document.metadata, "Title");
    const publisher = getMetaFieldFromMetadata(document.metadata, "Publisher");
    const place = getMetaFieldFromMetadata(document.metadata, "Place");
    const catalogue_record = getMetaFieldFromMetadata(document.metadata, "Catalogue record");
    return {
        identifier,
        title,
        publisher,
        place,
        catalogue_record
    };
}

export async function bl_marc(document_id: string) {
    const url = `http://primocat.bl.uk/F/?func=direct&local_base=PRIMO&doc_number=${document_id}&format=001&con_lng=eng`;
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const marc = doc.querySelector("table table");
    const trs = marc?.querySelectorAll("tr");
    let marc_record: MarcRecord[] = [];
    if (trs) {
        for (let i = 0; i < trs.length; i++) {
            const tr = trs.item(i);
            const tds = tr?.querySelectorAll("td");
            if (tds.length === 2) {
                const marc_id = tds.item(0);
                const marc_value = tds.item(1);
                marc_record.push({
                    id: marc_id?.textContent || "",
                    value: marc_value?.textContent || ""
                });
            }
        }
    }
    return marc_record;
}
