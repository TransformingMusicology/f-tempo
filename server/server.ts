/*******************************************************************************
 * Imports
 ******************************************************************************/
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import express, {NextFunction, Request, Response} from 'express';
import fileUpload from 'express-fileupload';

import cors from 'cors';
import nconf from '../lib/config.js';
import * as Sentry from "@sentry/node";

import api from "./routes/api.js";


/*******************************************************************************
 * Globals / init
 ******************************************************************************/

interface StringToAny {
    [key: string]: any;
}

const app = express();
const hasSentry = process.env.FTEMPO_SENTRY_DSN !== undefined;

if (hasSentry) {
    Sentry.init({
        dsn: process.env.FTEMPO_SENTRY_DSN,
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({tracing: true}),
        ],
        environment: process.env.NODE_ENV === "production" ? "production" : "development"
    });
    app.use(Sentry.Handlers.requestHandler());
}

const databases = nconf.get('databases')
console.log(`Databases = ${databases}`);

const localJpgRoot = process.env.NODE_ENV !== 'production' ? nconf.get('config:local_jpg_root') : undefined;
export const BASE_IMG_URL = nconf.get('config:base_image_url');
export const BASE_MEI_PATH = nconf.get('config:base_mei_path');

/*******************************************************************************
 * Setup
 ******************************************************************************/
console.log("F-TEMPO server started at " + Date());

const db_paths = nconf.get('database_files');
// TODO: Make this type actually represent a json db entry
export const db: StringToAny = {};
const storage_location = nconf.get('config:storage');
for (const key of databases) {
    console.log(`Loading ${key}`);
    if (!db_paths.hasOwnProperty(key)) {
        console.error(`Cannot find data file for collection ${key}`);
        continue;
    }
    const filename = db_paths[key];
    const full_path = path.join(storage_location, filename as string)
    try {
        fs.accessSync(full_path, fs.constants.R_OK)
        const data = fs.readFileSync(full_path);
        db[key] = JSON.parse(data.toString());
    } catch (err) {
        // TODO: This could be any exception, not just file doesn't exist
        console.error(`Cannot find file ${filename} in ${storage_location}`);
    }
}

if (localJpgRoot) {
    app.use('/img/jpg', express.static(path.resolve(localJpgRoot), {index: false}));
}
app.use(fileUpload());
app.use(express.json());
app.use(function(error: Error, request: Request, response: Response, next: NextFunction) {
    // Error handler, for the json parse r, a SyntaxError means that parsing the JSON failed.
    if (error instanceof SyntaxError) {
        return response.status(400).json({error: "Body JSON is invalid"});
    }
    next();
})
app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(cors());

app.use('/', api);

// The React interface is built into frontend/dist (see README). Anything that
// isn't an API route falls through to its index.html so client-side routes work.
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');
app.use(express.static(frontendDist, {index: false}));
app.get(/^(?!\/api(\/|$)).*/, (request: Request, response: Response) => {
    if (!fs.existsSync(frontendIndex)) {
        return response.status(503).type('text/plain')
            .send('The web interface has not been built. Run `npm run build` in frontend/ (or `npm run dev` there for development).');
    }
    return response.sendFile(frontendIndex);
});

if (hasSentry) {
    app.use(Sentry.Handlers.errorHandler());
}
app.use(errorMiddleware);


app.listen(
    nconf.get('server:port'),
    nconf.get('server:host'),
    () => console.log('EMO app listening on port 8000!')
);

function errorMiddleware(error: Error, request: Request, response: Response, next: NextFunction) {
    console.log("in the error middlewore")
    console.log(error)
    if (response.headersSent) {
        return next(error)
    }
    return response.status(500).json({status: 'error', error: 'Unexpected error'})
}
