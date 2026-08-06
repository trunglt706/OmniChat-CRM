/**
 * CSRF constants for client-side use.
 * This file must NOT import any Node.js modules (crypto, redis, etc.)
 * because it is bundled into the browser.
 */

export const CSRF_COOKIE_NAME = 'omnichat.csrf'
export const CSRF_HEADER = 'x-csrf-token'
export const CSRF_BODY_FIELD = '_csrf'
