import cp from 'child_process';
import fs from 'fs';
import path from 'path';

export class NoSuchBinaryError extends Error {
    constructor(program: string) {
        super(`Program '${program}' doesn't exist`);
    }
}

export class OmrFailedError extends Error {
    constructor(step: string) {
        super(`Optical music recognition failed while running ${step}`);
    }
}

export function perform_omr_image(workingDir: string, imageName: string) {
    const status = cp.spawnSync(
        "convert",
        [imageName, "-alpha", "off", "-compress", "none", "page.tiff"],
        {cwd: workingDir})
    if (status.status !== 0) {
        console.error("Error when running 'convert'");
        if ((status.error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new NoSuchBinaryError('convert');
        }
        console.error(status.stdout?.toString())
        console.error(status.stderr?.toString())
        throw new OmrFailedError('convert');
    }

    const aruspixStatus = cp.spawnSync(
        "aruspix-cmdline",
        ["-m", "/storage/ftempo/aruspix_models", "page.tiff"],
        {cwd: workingDir})
    if (aruspixStatus.status !== 0) {
        console.error("Error when running aruspix");
        console.error(aruspixStatus.stdout?.toString());
        console.error(aruspixStatus.stderr?.toString());
        if ((aruspixStatus.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
            throw new NoSuchBinaryError('aruspix-cmdline');
        }
        throw new OmrFailedError('aruspix');
    }

    const zipStatus = cp.spawnSync(
        "unzip",
        ["-q", "page.axz", "page.mei"],
        {cwd: workingDir})
    if (zipStatus.status !== 0) {
        console.error("Error when uncompressing archive");
        console.error(zipStatus.stdout?.toString());
        console.error(zipStatus.stderr?.toString());
        throw new OmrFailedError('unzip');
    }

        
    return fs.readFileSync(path.join(workingDir, 'page.mei'), 'utf-8');
}
