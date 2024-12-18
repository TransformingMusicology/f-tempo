import express from 'express';
import fs from 'fs';
import {
    get_codestring,
    get_random_id, MawsTooShortError, next_id, NextIdNotFound, NoMawsForDocumentError, UnknownSearchTypeError,
    run_image_query,
    search,
    search_by_codestring,
    search_by_id,
    search_subsequence,
    get_metadata,
    SearchResponse,
    get_mei
} from "../services/search.js";
import {db} from "../server.js"
import fileUpload from "express-fileupload";
import {CannotRunMawError} from "../../lib/maw.js";

const router = express.Router();

// Get a list of all catalogues loaded in the server
router.get('/api/catalogues', async function(req, res) {
    return res.status(200).json({status: "ok", data: Object.keys(db)});
});

// Returns a random id from the database
router.get('/api/random_id', async function(req, res) {
    try {
        const id = await get_random_id();
        return res.status(200).json(id);
    } catch (err) {
        return res.status(500).json({status: "error", error: "Unable to contact random server"});
    }
});

// Get metadata (library, book, image location) for a given ID
router.get('/api/metadata', async function(req, res) {
    const page_id = req.query.id as string;
    try {
        const metadata = await get_metadata(page_id);
        if (metadata) {
            return res.status(200).json(metadata);
        } else {
            return res.status(404).json(metadata);
        }
    } catch (err) {
        return res.status(500).json({status: "error", error: "Unable to contact random server"});
    }
});

// Returns a new id (next/previous page/book) in response to that in the request
/**
Find the next book id or page id for the provided arguments.
 Required GET arguments:
   - library
   - book
   - page [optional]
   - direction 'next' or 'prev', default next if not set.
 If the `page` argument isn't provided, give the next or previous book
 */
router.get('/api/next_id', function (req, res, next) {
    const library = req.query.library as string;
    const book_id = req.query.book as string;
    const page_id = req.query.page as string;
    const valid_directions = ["next", "prev"];
    const direction = req.query.direction === "next" ? "next" : "prev";

    if (!valid_directions.includes(direction)) {
        return res.status(400).json({status: "error", error: "Invalid `direction` field"});
    }

    if (!library) {
        return res.status(400).json({status: "error", error: "No `library` field provided"});
    }
    if (!book_id) {
        return res.status(400).json({status: "error", error: "No `book` field provided"});
    }

    try {
        const id = next_id(library, book_id, page_id, direction);
        return res.json({status: "ok", data: id});
    } catch (e) {
        if (e instanceof NextIdNotFound) {
            return res.status(e.status).json({status: "error", error: e.message})
        }
        next(e)
    }
});

router.get('/api/get_codestring', async function (req, res) {
    const id = req.query.id as string;
    if (id === undefined) {
        return res.status(400).json({status: "error", error: "'id' field required"});
    }
    const searchResult = await get_codestring(id);
    if (searchResult) {
        res.json({status: "ok", "data": searchResult});
    } else {
        res.status(404).json({status: "error", error: "Codestrings not found"})
    }
});

router.get('/api/get_mei', async function (req, res) {
    const id = req.query.id as string;
    if (id === undefined) {
        return res.status(400).json({status: "error", error: "'id' field required"});
    }
    const searchResult = await get_mei(id);
    if (searchResult) {
        res.setHeader('content-type', 'text/xml');
        res.send(searchResult);
    } else {
        res.status(404).json({status: "error", error: "Codestrings not found"})
    }
});

/**
 * Perform an subsequence search
 * POST a json document with content-type application/json with the following structure
 * {subsequence: a space separated string of notes or intervals to search
 *  interval: true if search is intervals, false if notes}
 */
router.post('/api/query_subsequence', async function (req, res, next) {
    if (req.body === undefined) {
        return res.status(400).send({error: "Body value required"});
    }
    try {
        const num_results = req.body.num_results || 20;
        const threshold = parseInt(req.body.threshold || "0", 10);
        const interval = req.body.interval === "true" || req.body.interval === true || false;
        let collections_to_search = [];
        if (req.body.collections_to_search !== undefined) {
            collections_to_search = req.body.collections_to_search;
        }

        const subsequence = req.body.subsequence;
        if (subsequence === undefined) {
            return res.status(400).json({status: "error", error: "'subsequence' field required"})
        }

        // Convert subsequences from a space separated string to an array
        if (subsequence && subsequence.trim().length) {
            const response = await search_subsequence(subsequence, num_results, threshold, interval, collections_to_search);
            const match_type = interval ? "interval" : "note";
            return res.json({status: "ok", "data": {match_type, results: response}});
        } else {
            return res.status(400).json({status: "error", error: "No subsequences set"})
        }
    } catch (e) {
        return next(e);
    }
});

/**
 * Perform a search
 *
 *
 * POST a json document with content-type application/json with the following structure
 * { id: if set, perform a search using the document with this siglum
 *   codestring: if set, perform a search with this codestring
 *   threshold:
 *   similarity_type:
 *   }
 */
router.post('/api/query', async function (req, res, next) {
    // Defaults
    let num_results = 20;
    let threshold = 0;
    let collections_to_search = [];

    // Set values if given in query
    if (req.body.num_results !== undefined) {
        num_results = parseInt(req.body.num_results, 10);
        if (isNaN(num_results)) {
            return res.status(404).json({status: "error", error: "num_results field must be a number"})
        }
    }
    if (req.body.threshold !== undefined) {
        threshold = parseInt(req.body.threshold, 10);
        if (isNaN(threshold)) {
            threshold = 0;
        }
    }
    if (req.body.collections_to_search !== undefined) {
        collections_to_search = req.body.collections_to_search;
    }

    const similarity_type = req.body.similarity_type;

    let result: SearchResponse;
    try {
        if (req.body.id) {
            // TODO: result could be an error, should this be an exception?
            result = await search_by_id(req.body.id, collections_to_search, num_results, threshold,  similarity_type);
        } else if (req.body.codestring) {
            result = await search_by_codestring(req.body.codestring, collections_to_search, num_results, threshold, similarity_type);
        } else if (req.body.maws) {
            const maws = req.body.maws.split(" ");
            result = await search(maws, collections_to_search, num_results, threshold, similarity_type);
        } else {
            return res.status(400).json({status: "error", error: "'id' or 'codestring' or 'maws' field required"})
        }
        return res.json({status: "ok", data: result});
    } catch (err) {
        if (err instanceof NoMawsForDocumentError || err instanceof MawsTooShortError) {
            return res.status(404).json({status: "error", error: err.message})
        } else if (err instanceof CannotRunMawError) {
            return res.status(500).json({status: "error", error: err.message})
        } else if (err instanceof UnknownSearchTypeError) {
            return res.status(400).json({status: "error", error: err.message})
        }
        next(err)
    }
});


router.post('/api/image_query', async function (req, res, next) {
    if (!req.files) {
        return res.status(400).json({status: "error", error: 'No files were uploaded.'});
    }

    let user_image = req.files.user_image_file as fileUpload.UploadedFile;

    try {
        const result = await run_image_query(user_image);
        return res.json({status: "ok", data: result});
    } catch (e) {
        next(e);
    }
});

router.post('/api/log', function (req, res, next) {
    const log_entry = req.body.log_entry;
    const log = req.body.log;
    if (!log_entry) {
        return res.status(400).send('No report was provided.');
    }
    if (!log) {
        return res.status(400).send('No log was specified.');
    }

    try {
        fs.appendFileSync('./logs/' + log, log_entry);
        return res.send(
            `Successfully logged:
    ${log_entry}
to log ${log}.`
        );
    } catch (err) {
        next(err);
    }


});

export default router;