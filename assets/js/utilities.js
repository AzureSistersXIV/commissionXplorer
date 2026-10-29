/**
 * @file Application logic: page state, search, content loading and navigation.
 *
 * The URL is the single source of truth for what is displayed:
 *
 *   /                  welcome page, SFW artists
 *   /?isNsfw=true      welcome page, NSFW artists included
 *   /?artist=<name>    artist page (artwork gallery)
 *
 * Navigation uses history.pushState(). Every navigation, back/forward included,
 * ends in loadContent(), which re-renders the page from the URL.
 *
 * Depends on: config.js (apiUrl, SITE_NAME, WELCOME_TITLE), events.js (isNsfw,
 * addClick, addInput, addKeyDown) and generation.js (generateCard, generatePreview).
 */

// *** Constants ***

/** Number of thumbnail requests sent in parallel. */
const THUMBNAIL_CONCURRENCY = 4;

/** Pause before thumbnail generation starts, for UI smoothness. */
const START_DELAY_MS = 250;

/** Number of artist cards rendered per animation frame. */
const CARD_CHUNK_SIZE = 20;

/** Delay before highlighting the artist typed in the search field after a reload. */
const SUGGESTION_DELAY_MS = 500;

/** When true, typing a prefix that matches a single artist selects it automatically. */
const FORCE_UNIQUE_SUGGESTION = false;

var inclusive;

// *** Generic helpers ***

/** Resolves after `ms` milliseconds. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves on the next animation frame (lets the browser paint). */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Drops the leading segment of a server path.
 * artworks.php returns "../commissions/Artist/x.jpg"; the other endpoints
 * expect "commissions/Artist/x.jpg".
 * @param {string} artwork
 * @returns {string}
 */
const toRelativePath = (artwork) => artwork.split("/").slice(1).join("/");

/** Reloads the current page. */
function reloadPage() {
  location.reload();
}

/**
 * Capitalizes the first letter and lowercases the rest.
 * @param {string} string
 * @returns {string} The transformed string, or "" for an empty input.
 * @example
 * ucFirst("hELLO"); // "Hello"
 */
function ucFirst(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// *** Loading indicator ***

/** Number of operations currently using the spinner (see beginLoading()). */
let loadingUsers = 0;

/**
 * Shows the loading indicator. Every call must be paired with one endLoading().
 * The indicator stays visible until all operations that started it have finished,
 * so concurrent operations (new-artist check, page load) do not hide it early.
 */
function beginLoading() {
  loadingUsers++;
  document.querySelector("#spinner").classList.add("loading");
}

/** Marks one operation as finished; hides the indicator and clears its text when none remain. */
function endLoading() {
  loadingUsers = Math.max(0, loadingUsers - 1);
  if (loadingUsers > 0) return;

  document.querySelector("#spinner").classList.remove("loading");
  setProgressText("");
}

/**
 * Sets the progress text next to the loading indicator ("3 / 12", "40%", ...).
 * @param {string} text
 */
function setProgressText(text) {
  document.querySelector("#spinnerNumber").textContent = text;
}

// *** Page state (derived from the URL) ***

/**
 * Returns the artist requested in the URL.
 * @returns {string} The artist name, or "" on the welcome page.
 */
function getArtistParam() {
  return new URLSearchParams(window.location.search).get("artist") ?? "";
}

/**
 * Tells whether the welcome page (artist list) is displayed, as opposed to an
 * artist page. Derived from the URL, not from the document title.
 * @returns {boolean}
 */
function isWelcomePage() {
  return getArtistParam() === "";
}

/**
 * Sets the document title and meta description from the URL.
 * "<Artist> | Commission Xplorer" on an artist page, the welcome title otherwise.
 */
function setPageTitle() {
  const artist = getArtistParam();
  document.title = artist ? `${ucFirst(artist)} | ${SITE_NAME}` : WELCOME_TITLE;

  const description = document.querySelector("meta[name='description']");
  if (description) {
    description.content = artist
      ? `Commissions by ${artist}`
      : `Explore and manage commissions effortlessly with ${SITE_NAME}.`;
  }
}

/**
 * Reads the `isNsfw` URL parameter, whatever the page.
 * Mirrors parseMaxLevel() in api/utilitaires.php.
 * @returns {boolean|number} `true` for "true", a number from 0 to
 *   {@link MAX_NSFW_LEVEL} for a numeric value (larger values are clamped),
 *   `false` otherwise.
 * @example
 * // ?isNsfw=true -> true   ?isNsfw=3 -> 3   ?isNsfw=9 -> 4   (absent) -> false
 */
function parseNsfwParam() {
  const raw = new URLSearchParams(window.location.search).get("isNsfw");
  if (raw === "true") return true;
  if (/^\d+$/.test(raw ?? "")) return Math.min(Number(raw), MAX_NSFW_LEVEL);
  return false;
}

/**
 * Updates the global `isNsfw` from the URL. The filter only applies to the
 * welcome page; on an artist page it is `false`.
 */
function setIsNsfw() {
  isNsfw = isWelcomePage() ? parseNsfwParam() : false;
}

// *** Search ***

/**
 * Empties the suggestion list and resets the related UI: hides the list and the
 * backdrop, clears the results counter.
 */
function emptySuggestions() {
  const suggestions = document.querySelector("#suggestions");
  suggestions.innerHTML = "";
  suggestions.classList.remove("show");
  document.querySelector("#backdrop").className = "";
  document.querySelector("#results").textContent = "";
}

/**
 * Keyboard handler for the suggestion list.
 * - ArrowDown / ArrowUp: move the selection (wraps around)
 * - Enter: activate the selected suggestion
 *
 * Arrow keys are prevented from scrolling the page.
 *
 * @param {KeyboardEvent} event
 * @returns {boolean} True if the key was handled.
 */
function navigateSuggestions(event) {
  const list = document.querySelector("#suggestions");
  const items = list.querySelectorAll("li");
  if (!items.length) return false;

  const selected = list.querySelector(".selected");
  let index = Array.from(items).indexOf(selected); // -1 when nothing is selected

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      index = (index + 1) % items.length;
      break;
    case "ArrowUp":
      event.preventDefault();
      index = index <= 0 ? items.length - 1 : index - 1;
      break;
    case "Enter":
      if (selected) accessSuggestion(selected.textContent);
      return true;
    default:
      return false;
  }

  items.forEach((item) => item.classList.remove("selected"));
  items[index].classList.add("selected");
  setTimeout(() => items[index].scrollIntoView({ behavior: "smooth", block: "nearest" }), 10);
  return true;
}

/**
 * Click handler of a suggestion: activates it.
 * @param {MouseEvent} event - Click on a suggestion `<li>`.
 */
function transmitClick(event) {
  accessSuggestion(event.currentTarget.textContent);
}

/**
 * Selects an artist from the suggestions: highlights its card, then clears the
 * search field so the next search starts from scratch.
 * @param {string} artistName
 */
function accessSuggestion(artistName) {
  const searchField = document.querySelector("#search");
  searchField.value = artistName;
  showUniqueSuggestion();
  searchField.value = "";
}

/**
 * Input handler of the search field.
 *
 * Hides the cards whose artist name does not start with the typed text, fills
 * the suggestion list with the matching ones, updates the "matches / total"
 * counter and enables keyboard navigation. Does nothing for an empty search or
 * when there is a single card.
 *
 * @param {Event} event - "input" event of the search field.
 */
function showSuggestions(event) {
  emptySuggestions();

  const input = event.currentTarget;
  const search = input.value.toLowerCase();
  const cards = document.querySelectorAll(".card");
  if (!search || cards.length <= 1) return;

  const suggestions = document.querySelector("#suggestions");

  cards.forEach((card, idx) => {
    const cardName = card.id.trim().toLowerCase();
    const included = cardName.startsWith(search);

    card.dataset.hidden = !included;
    card.classList.remove("searched");
    if (!included) return;

    const li = document.createElement("li");
    li.textContent = ucFirst(cardName);
    li.dataset.card = `#${cardName}`; // hooks for styling or scripting
    li.dataset.pos = idx;
    suggestions.appendChild(li);
    addClick(li, transmitClick);
  });

  document.querySelector("#backdrop").className = "show";
  document.querySelector("#results").textContent = `${suggestions.childElementCount} / ${cards.length}`;
  addKeyDown(input, navigateSuggestions);

  if (FORCE_UNIQUE_SUGGESTION && suggestions.childElementCount === 1) {
    input.value = suggestions.querySelector("li").textContent;
    showUniqueSuggestion();
  }
}

/**
 * Shows only the card whose artist name equals the search field (case-insensitive):
 * highlights it, scrolls to it and closes the suggestions. All other cards are hidden.
 */
function showUniqueSuggestion() {
  const searchTerm = document.querySelector("#search").value.trim().toLowerCase();

  document.querySelectorAll(".card").forEach((card) => {
    if (card.id.toLowerCase() === searchTerm) {
      card.classList.add("searched");
      setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "nearest" }), 10);
      document.querySelector(".bumper").scrollIntoView({ behavior: "instant", block: "start" });
      emptySuggestions();
    } else {
      card.dataset.hidden = true;
    }
  });
}

// *** Content loading ***

/** Aborts the previous page load when a new one starts (see loadContent()). */
let currentLoad = null;

/**
 * Renders the page described by the URL: the artist list on the welcome page,
 * the artworks of one artist otherwise.
 *
 * Called at startup and after every navigation. Resets the gallery, syncs the
 * title and the visibility of the return button and navigation bar, then starts
 * the matching loader. A load still running from a previous call is aborted, so
 * a slow load can never write into a page it no longer belongs to.
 */
function loadContent() {
  currentLoad?.abort();
  currentLoad = new AbortController();
  const { signal } = currentLoad;

  setPageTitle();
  setIsNsfw();
  const isWelcome = isWelcomePage();

  const gallery = document.querySelector("#gallery");
  gallery.innerHTML = isWelcome ? "<span class='push'></span>" : "";
  gallery.style.marginTop = isWelcome ? "" : "unset";

  showReturnButton(!isWelcome);
  showNavBar();

  if (isWelcome) {
    loadArtists(signal);
  } else {
    loadArtworks(signal);
  }
}

/**
 * Loads the artist list and renders one card per artist, a chunk at a time so
 * the progress counter and the cards appear gradually.
 *
 * @param {AbortSignal} signal - Aborted when a newer load supersedes this one.
 * @returns {Promise<void>}
 */
async function loadArtists(signal) {
  setIsNsfw();
  const search = document.querySelector("#search");

  beginLoading();
  try {
    const query = new URLSearchParams({ isNsfw, inclusive });
    const res = await fetch(`${apiUrl("artists.php")}?${query}`, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const artists = await res.json();
    const names = Object.keys(artists);
    const total = names.length;
    setProgressText(`0 / ${total}`);

    for (let i = 0; i < total; i += CARD_CHUNK_SIZE) {
      if (signal.aborted) return;

      for (const name of names.slice(i, i + CARD_CHUNK_SIZE)) {
        addClick(generateCard(name, artists[name]), goToArtist);
      }

      setProgressText(`${Math.min(i + CARD_CHUNK_SIZE, total)} / ${total}`);
      await nextFrame(); // let the browser paint before the next chunk
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Failed to update artist list:", err.message);
    }
  } finally {
    endLoading();

    if (!signal.aborted) {
      addInput(search, showSuggestions);

      // Coming back from an artist page: re-apply the search (see returnIndex())
      if (search.value) {
        setTimeout(showUniqueSuggestion, SUGGESTION_DELAY_MS);
      }
    }
  }
}

/**
 * Loads the artwork list of the artist in the URL, generates the missing
 * thumbnails and displays the previews.
 *
 * @param {AbortSignal} signal - Aborted when a newer load supersedes this one.
 * @returns {Promise<void>}
 */
async function loadArtworks(signal) {
  const artist = getArtistParam();
  if (!artist) {
    console.error("Missing 'artist' URL parameter");
    return;
  }

  beginLoading();
  try {
    const response = await fetch(apiUrl("artworks.php"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ artist }),
      signal,
    });

    // artworks.php answers 400/404 with {"error": "..."} on bad input
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const artworks = await response.json();
    if (!Array.isArray(artworks)) throw new Error("Unexpected response format");

    await sleep(START_DELAY_MS);
    if (signal.aborted) return;

    await setThumbnails(artist, artworks.map(toRelativePath), signal);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Failed to update artworks list:", err.message);
    }
  } finally {
    endLoading();
  }
}

/**
 * Generates the thumbnails of an artist's artworks through thumbnail.php, then
 * displays the previews.
 *
 * Requests run in a small pool ({@link THUMBNAIL_CONCURRENCY}) and progress is
 * counted on the client. One failing artwork is logged and skipped; it does not
 * stop the others. If the load is aborted, no preview is created.
 *
 * @param {string} artist - Artist name (used for logging).
 * @param {string[]} artworks - Relative paths, e.g. "commissions/Artist/x.jpg".
 * @param {AbortSignal} signal - Aborted when a newer load supersedes this one.
 * @returns {Promise<void>}
 */
async function setThumbnails(artist, artworks, signal) {
  const total = artworks.length;
  if (total === 0) return;

  let next = 0; // index of the next artwork to process
  let done = 0;
  const failed = [];

  setProgressText("0%");
  console.debug(`${artist}: 0% - Start`);

  // Each worker takes the next artwork until none is left. No await sits between
  // the check and the increment, so two workers never take the same artwork.
  async function worker() {
    while (next < total && !signal.aborted) {
      const artwork = artworks[next++];

      try {
        const response = await fetch(apiUrl("thumbnail.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artworks: [artwork] }),
          signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (err) {
        if (err.name === "AbortError") return;
        failed.push(artwork);
        console.error(`Thumbnail failed for ${artwork}:`, err.message);
      }

      done++;
      if (!signal.aborted) setProgressText(`${Math.round((done / total) * 100)}%`);
    }
  }

  const workerCount = Math.min(THUMBNAIL_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workerCount }, worker));
  if (signal.aborted) return;

  artworks.forEach((artwork) => generatePreview(`../${artwork}`));

  if (failed.length > 0) {
    console.warn(`${artist}: ${failed.length}/${total} thumbnails failed`, failed);
  }
  console.debug(`${artist}: ${done}/${total} - End`);
}

/**
 * Asks the server whether new artists were added. The result is only logged to
 * the console, the UI is not updated. Failures are logged and otherwise ignored.
 * @returns {Promise<void>}
 */
async function checkNew() {
  beginLoading();
  try {
    const res = await fetch(apiUrl("new.php"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const artists = await res.json();
    if (artists.length > 0) console.debug("New artists:", artists);
  } catch (err) {
    console.warn("Failed to check new artists:", err.message);
  } finally {
    endLoading();
  }
}

// *** UI visibility ***

/**
 * Syncs the content filter with the URL and wires its handlers.
 * - dropdown: selects the current level and listens for changes
 * - SFW/NSFW buttons: checks the matching radio and listens for label clicks
 *
 * The URL is read directly rather than through `isNsfw`, which is `false` on an
 * artist page even when the URL carries a filter.
 *
 * @param {HTMLElement} root - The `.content-filters` container.
 */
function reloadFiltersButtons(root) {
  const current = parseNsfwParam();
  const dropdown = root.querySelector("select");

  if (dropdown) {
    dropdown.value = String(current);
    addChange(dropdown, changeNsfwLevel);
    return;
  }

  root.querySelector(`input[type='radio'][value='${current}']`).defaultChecked = true;
  root.querySelectorAll("span > label").forEach((label) => addClick(label, changeFilter));
}

/**
 * Shows or hides the return button; when shown, a click goes back to the welcome page.
 * @param {boolean} visible
 */
function showReturnButton(visible) {
  const returnBtn = document.getElementById("returnBtn");
  returnBtn.hidden = !visible;
  if (visible) addClick(returnBtn, returnIndex);
}

/** Shows the navigation bar (filters and search) on the welcome page only. */
function showNavBar() {
  document.querySelector("nav").hidden = !isWelcomePage();
}

// *** Navigation ***

/**
 * Pushes a new history entry that keeps the current path and uses the given
 * query parameters. The resulting navigation is picked up by loadContent().
 * @param {URLSearchParams} searchParams
 */
function pushSearchParams(searchParams) {
  const query = searchParams.toString();
  history.pushState(null, "", query ? `${location.pathname}?${query}` : location.pathname);
}

/**
 * Click handler of the SFW/NSFW labels: switches the filter by updating the
 * `isNsfw` URL parameter, and clears the search field. Does nothing if the
 * clicked option is already active.
 * @param {MouseEvent} event - Click on a filter label.
 */
function changeFilter(event) {
  const wantsNsfw = event.currentTarget.htmlFor === "nsfw";
  inclusive = false;
  if (wantsNsfw === isNsfw) return;

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("isNsfw", wantsNsfw);
  pushSearchParams(searchParams);
  document.querySelector("#search").value = "";
}

/**
 * Change handler of the content-level dropdown: stores the chosen level in the
 * `isNsfw` URL parameter and clears the search field. Does nothing if the level
 * is already active.
 * @param {Event} event - "change" event of the `<select>`.
 */
function changeNsfwLevel(event) {
  const level = Number(event.currentTarget.value);
  inclusive = true;
  if (level === isNsfw) return;

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("isNsfw", level);
  pushSearchParams(searchParams);
  document.querySelector("#search").value = "";
}

/**
 * Click handler of an artist card: opens that artist's page by setting the
 * `artist` URL parameter (the `isNsfw` parameter is kept).
 * @param {MouseEvent} event - Click on a card; the card id is the artist name.
 */
function goToArtist(event) {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("artist", event.currentTarget.id);
  pushSearchParams(searchParams);
}

/**
 * Click handler of the return button: goes back to the welcome page and puts the
 * artist just left in the search field, so loadArtists() highlights it.
 */
function returnIndex() {
  const searchParams = new URLSearchParams(window.location.search);
  const artist = searchParams.get("artist") ?? "";
  searchParams.delete("artist");
  pushSearchParams(searchParams);
  document.querySelector("#search").value = artist;
}