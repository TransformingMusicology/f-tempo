import fs from "fs";

export function getMetaFieldFromMetadata(metadata: any, fieldName: string) {
    const meta = metadata.filter((entry: any) => entry.label === fieldName);
    if (meta.length > 0) {
        return meta[0].value;
    }
    return undefined;
}

export async function downloadAndSaveImage(imageUrl: string, filename: string) {
    const headers = new Headers({
        "User-Agent"   : "F-tempo-bot/1.0 (https://f-tempo.org/, alastair@porter.net.nz)"
    });
    const response = await fetch(imageUrl, { headers });
    if (!response.ok) {
        throw new Error(`Could not download ${imageUrl}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(buffer));
}
