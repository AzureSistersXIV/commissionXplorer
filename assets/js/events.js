/**
 * @file Application bootstrap and event-listener helpers.
 *
 * Depends on: utilities.js (setIsNsfw, checkNew, loadContent) and
 * generation.js (generateHeader, generateMain).
 */

/**
 * NSFW filter currently applied to the artist list.
 * - `false` / `true`: SFW / NSFW (the two-button filter)
 * - `0` to `4`: a content level (the dropdown filter, see generateHeader())
 *
 * Written by setIsNsfw() (utilities.js); sent to the API when loading artists.
 * Beware that `0` is falsy: use `typeof isNsfw === "number"` to detect a level.
 * @type {boolean|number}
 */
let isNsfw = false;

// *** Bootstrap ***

document.addEventListener("DOMContentLoaded", () => {
  preventContextualMenu();
  setIsNsfw();
  generateHeader(document.body);
  generateMain(document.body);

  checkNew();
  addNavigateSuccess(loadContent); // re-render on every navigation, back/forward included
  loadContent(); // initial render
});

// *** Navigation events ***

/** Callbacks registered while the Navigation API is unavailable. */
const navigationFallbackHandlers = new Set();

/** True once history.pushState/replaceState have been wrapped. */
let navigationFallbackInstalled = false;

/**
 * Emulates the Navigation API's "navigatesuccess" event for browsers without it.
 *
 * pushState() and replaceState() fire no event by themselves, so they are wrapped
 * to notify the registered handlers, and popstate/hashchange are forwarded too.
 * Safe to call several times: the wrapping is done only once.
 * @private
 */
function installNavigationFallback() {
  if (navigationFallbackInstalled) return;
  navigationFallbackInstalled = true;

  const notify = () => {
    // Same shape as the fields the Navigation API event would expose
    const event = { destination: { url: window.location.href }, state: history.state };
    navigationFallbackHandlers.forEach((handler) => handler(event));
  };

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      original.apply(this, args);
      notify();
    };
  }

  window.addEventListener("popstate", notify);
  // Note: a fragment change fires both popstate and hashchange, so handlers may
  // run twice. The app does not use fragments, so this does not matter today.
  window.addEventListener("hashchange", notify);
}

/**
 * Calls `handler` after each successful same-document navigation (pushState,
 * back/forward). Uses the Navigation API when available, otherwise falls back to
 * wrapping the History API (see {@link installNavigationFallback}).
 *
 * Registering the same function twice has no effect.
 *
 * @param {Function} handler - Called on each navigation.
 */
function addNavigateSuccess(handler) {
  if (window.navigation) {
    window.navigation.addEventListener("navigatesuccess", handler);
    return;
  }

  installNavigationFallback();
  navigationFallbackHandlers.add(handler);
}

// *** Listener helpers ***
//
// addEventListener() ignores a second registration of the same function with the
// same options, so these helpers are idempotent as long as the same function
// *reference* is passed each time. Anonymous functions are therefore registered
// again on every call.

/**
 * Registers a "popstate" listener on the window (idempotent).
 * @param {(event: PopStateEvent) => void} handler
 */
function addPopState(handler) {
  window.addEventListener("popstate", handler);
}

/**
 * Registers an "input" listener on an element (idempotent).
 * @param {HTMLElement} element
 * @param {(event: Event) => void} handler
 * @example
 * addInput(document.querySelector("#search"), showSuggestions);
 */
function addInput(element, handler) {
  element.addEventListener("input", handler);
}

/**
 * Registers a "change" listener on an element (idempotent).
 * @param {HTMLElement} element
 * @param {(event: Event) => void} handler
 */
function addChange(element, handler) {
  element.addEventListener("change", handler);
}

/**
 * Registers a "keydown" listener on an element (idempotent).
 * @param {HTMLElement} element
 * @param {(event: KeyboardEvent) => void} handler
 */
function addKeyDown(element, handler) {
  element.addEventListener("keydown", handler);
}

/**
 * Registers a "click" listener on an element (idempotent).
 * @param {HTMLElement} element
 * @param {(event: MouseEvent) => void} handler
 * @example
 * addClick(card, goToArtist);
 */
function addClick(element, handler) {
  element.addEventListener("click", handler);
}

// *** Misc ***

/** Disables the browser's context menu (right-click) on the whole document. */
function preventContextualMenu() {
  document.addEventListener("contextmenu", (event) => event.preventDefault());
}