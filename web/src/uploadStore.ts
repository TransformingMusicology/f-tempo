/**
 * Preview images of uploads made in this session, keyed by the codestring the server recognised,
 * so the codestring search view can show what was uploaded. Not persisted: after a reload the
 * search is restored from the URL but the image is gone.
 */
export const uploadStore = new Map<string, string>();
