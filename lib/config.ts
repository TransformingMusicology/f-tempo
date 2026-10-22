import fs from 'fs';
import path from 'path';
import nconf from 'nconf';

// Every entry point, including worker threads, loads the same selected file
// before consumers capture configuration values at module initialization.
if (!process.env.FTEMPO_CONFIG) {
    throw new Error('Set FTEMPO_CONFIG to the JSON configuration file to use');
}
const configFile = path.resolve(process.env.FTEMPO_CONFIG);

if (!fs.existsSync(configFile)) {
    throw new Error(`Cannot find config file ${configFile}`);
}
nconf.argv().file({file: configFile});

export default nconf;
