/** Build-time configuration. Hostnames live here or in vite.config.ts, never in components. */

const IMAGE_BASE_URL: string = import.meta.env.VITE_IMAGE_BASE_URL ?? 'https://search.f-tempo.org/img/jpg/';

/** The page shown when the app is opened without a page ID. */
export const DEFAULT_PAGE_ID = 'GB-Lbl_A103b_025_0';

export function scanImageUrl(pageId: string): string {
    return `${IMAGE_BASE_URL}${encodeURIComponent(pageId)}.jpg`;
}

/**
 * Title-page URLs stored in the index are IIIF image URLs with a `,500` (height 500) size
 * segment. Ask for width 500 instead so the preview fits beside the scan.
 */
export function titlePageUrl(storedUrl: string): string {
    return storedUrl.split('/').map(segment => (segment === ',500' ? '500,' : segment)).join('/');
}
