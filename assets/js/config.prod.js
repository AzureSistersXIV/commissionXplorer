/**
 * @file Application-wide configuration and shared constants.
 *
 * All scripts are classic (non-module) scripts, so top-level declarations are
 * shared globals. The other scripts only read these values from inside
 * functions, so the load order is not critical, but load this file first.
 */

/**
 * Origin of the server hosting the API, the thumbnails and the commissions.
 * Must end with a slash.
 * @type {string}
 */
const host = `https://naslku.synology.me/`;

const service = "commissionXplorerAPI/";

/**
 * API folder, relative to {@link host}. Must end with a slash.
 * Build endpoint URLs with {@link apiUrl} rather than concatenating by hand.
 * @type {string}
 */
const API = "api/";

/**
 * Builds the full URL of an API endpoint.
 * @param {string} endpoint - Endpoint file name, e.g. "artists.php".
 * @returns {string} e.g. "http://localhost:8000/api/artists.php"
 */
function apiUrl(endpoint) {
  return `${host}${API}${endpoint}`;
}

/** Site name, used in page titles and in the header. */
const SITE_NAME = "Commission Xplorer";

/** Document title of the welcome page (the artist list). */
const WELCOME_TITLE = `Welcome | ${SITE_NAME}`;

/**
 * Image shown on an artist card when the artist has no thumbnail.
 * Must match DEFAULT_THUMB in api/artists.php.
 * @type {string}
 */
const PLACEHOLDER_THUMB = "./assets/img/folder.svg";

/**
 * Highest NSFW level. Must match MAX_LEVEL in api/utilitaires.php.
 * @type {number}
 */
const MAX_NSFW_LEVEL = 4;

/**
 * Options of the content-filter dropdown, used when the URL carries a numeric
 * level (`?isNsfw=0` to `?isNsfw=4`, see generateHeader()). `value` is sent to the
 * API as `isNsfw` and compared with the `level` stored in levels.json; edit the
 * labels freely.
 * @type {{value: number, label: string}[]}
 */
const NSFW_LEVELS = [
  { value: 0, label: "Regular" }, // safe for work
  { value: 1, label: "Suggestive" },
  { value: 2, label: "Nude" },
  { value: 3, label: "Sexual" },
  { value: 4, label: "Warning content" }, // extra NSFW
];