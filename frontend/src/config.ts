// Addresses that differ between deployments live here, never in components.
const imageBase = import.meta.env.VITE_IMAGE_BASE_URL || 'https://search.f-tempo.org/img/jpg/';

export function pageImageUrl(pageId: string): string {
    return `${imageBase}${encodeURIComponent(pageId)}.jpg`;
}

export const DEFAULT_PAGE_ID = 'GB-Lbl_A103b_025_0';
