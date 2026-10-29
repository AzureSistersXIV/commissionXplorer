/**
 * @file DOM builders: the page skeleton (header and main), artist cards and
 * artwork previews. Nothing here fetches data or decides what to display.
 *
 * Depends on: config.js (host, SITE_NAME, PLACEHOLDER_THUMB) and
 * utilities.js (reloadFiltersButtons).
 */

// File extensions (lowercase) that generatePreview() knows how to display
const pictureTypes = ["jpg", "jpeg", "png", "gif"];
const videoTypes = ["mp4", "mov", "avi"];
const audioTypes = ["wav", "mp3"];
const textTypes = ["txt", "md"];

/** Images shorter than this (in px) are centred instead of stretched. */
const SMALL_IMAGE_HEIGHT = 250;

/** Width (in px) of the generic icons used for placeholders, videos and text files. */
const ICON_WIDTH = "200px";

/**
 * Turns a server-relative path ("../thumbs/a.jpg.webp") into a URL on {@link host}.
 * @param {string} path
 * @returns {string}
 */
const toHostUrl = (path) => path.replace("../", host);

/**
 * Returns the lowercase extension of a path or URL, or "" if the file name has none.
 * @param {string} path
 * @returns {string}
 * @example
 * getExtension("../commissions/Bob/Cat.PNG"); // "png"
 */
function getExtension(path) {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

// *** Page skeleton ***

/**
 * Builds the header and appends it to `root`, followed by the "bumper" spacer.
 *
 * Resulting structure:
 * ```
 * <header>
 *   <h1>
 *   <span role=group> <button#returnBtn>
 *   <nav>
 *     <div.content-filters>  SFW / NSFW radio buttons, or a level dropdown
 *     <div.search-bar>       #results (counter), #search (input), #suggestions (list)
 * <div.bumper>
 * ```
 *
 * The content filter has two forms, chosen when the page loads from the
 * `isNsfw` URL parameter (see parseNsfwParam()):
 * - `?isNsfw=0` ... `?isNsfw=4`: a dropdown listing {@link NSFW_LEVELS}
 * - anything else: the SFW / NSFW radio buttons
 * Switching form needs a page reload.
 *
 * The filter is hidden when the URL has no query string at all.
 * That is a deliberate gate: it only appears once `?isNsfw=...` (or any other
 * parameter) is present.
 *
 * @param {HTMLElement} root - Element to append the header to (the document body).
 */
function generateHeader(root) {
  // Return button (shown on the artist page only, see showReturnButton())
  const returnBtn = document.createElement("button");
  returnBtn.id = "returnBtn";
  returnBtn.textContent = "Return";
  returnBtn.setAttribute("aria-label", "Return to previous page");
  returnBtn.setAttribute("aria-keyshortcuts", "Alt+ArrowLeft");

  const navControls = document.createElement("span");
  navControls.setAttribute("role", "group");
  navControls.setAttribute("aria-label", "Navigation controls");
  navControls.appendChild(returnBtn);

  // Site title
  const title = document.createElement("h1");
  title.id = "CommissionXplorer";
  title.textContent = SITE_NAME;
  title.setAttribute("aria-roledescription", "Site title");

  // Content filter: level dropdown for a numeric isNsfw, SFW / NSFW buttons otherwise
  const contentFilters =
    typeof parseNsfwParam() === "number" ? createFilterDropdown() : createFilterToggle();
  reloadFiltersButtons(contentFilters); // select the current option, wire the handlers

  if (new URLSearchParams(window.location.search).size === 0) {
    contentFilters.style.display = "none";
  }

  // Results counter (live region, announced by screen readers)
  const resultsCount = document.createElement("div");
  resultsCount.id = "results";
  resultsCount.setAttribute("aria-live", "polite");
  resultsCount.setAttribute("aria-atomic", "true");

  const resultsPart = document.createElement("span");
  resultsPart.appendChild(resultsCount);

  // Search input
  const search = document.createElement("input");
  search.name = "search";
  search.id = "search";
  search.type = "text";
  search.placeholder = "Search...";
  search.setAttribute("aria-label", "Search content");
  search.setAttribute("autocomplete", "off");
  search.setAttribute("role", "searchbox");

  const inputPart = document.createElement("span");
  inputPart.appendChild(search);

  // Suggestions list (filled by showSuggestions()).
  // role="list" is kept on purpose: Safari/VoiceOver drops list semantics from
  // lists styled with list-style: none.
  const suggestions = document.createElement("ul");
  suggestions.id = "suggestions";
  suggestions.setAttribute("role", "list");
  suggestions.setAttribute("aria-label", "Search suggestions");

  const suggestionsPart = document.createElement("span");
  suggestionsPart.appendChild(suggestions);

  const searchBar = document.createElement("div");
  searchBar.className = "search-bar";
  searchBar.setAttribute("role", "search");
  searchBar.append(resultsPart, inputPart, suggestionsPart);

  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Main navigation");
  nav.append(contentFilters, searchBar);

  // Header: its accessible name comes from the title
  const header = document.createElement("header");
  header.setAttribute("aria-labelledby", title.id);
  header.append(title, navControls, nav);

  // Spacer pushing the content below the (fixed) header
  const bumper = document.createElement("div");
  bumper.className = "bumper";

  root.append(header, bumper);
}

/**
 * Builds the main area and appends it to `root`.
 *
 * ```
 * <main>
 *   <div#gallery>     artist cards or artwork previews
 *   <div#spinner>     loading indicator: "Loading" text + #spinnerNumber (progress)
 *   <div#backdrop>    dimmed overlay shown while search suggestions are open
 * ```
 *
 * @param {HTMLElement} root - Element to append the main area to (the document body).
 */
function generateMain(root) {
  const gallery = document.createElement("div");
  gallery.id = "gallery";
  gallery.setAttribute("role", "region");
  gallery.setAttribute("aria-label", "Content gallery");

  // Loading indicator. #progressMore is no longer written to by any script;
  // it is kept in case the stylesheet still targets it.
  const spinnerLoad = document.createElement("div");
  spinnerLoad.id = "spinnerLoad";
  spinnerLoad.className = "loading-text";
  spinnerLoad.setAttribute("role", "status");
  spinnerLoad.setAttribute("aria-live", "polite");
  spinnerLoad.innerHTML = "Loading<div id='progressMore'></div>";

  const spinnerNumber = document.createElement("div");
  spinnerNumber.id = "spinnerNumber";
  spinnerNumber.className = "loading-text";
  spinnerNumber.setAttribute("aria-live", "polite");

  const spinner = document.createElement("div");
  spinner.id = "spinner";
  spinner.className = "spinner";
  spinner.append(spinnerLoad, spinnerNumber);

  const backdrop = document.createElement("div");
  backdrop.id = "backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-hidden", "true");

  const main = document.createElement("main");
  main.append(gallery, spinner, backdrop);

  root.appendChild(main);
}

// *** Cards and previews ***

/**
 * Creates an artist card and appends it to the gallery.
 *
 * The card's `id` is the artist name; goToArtist() and the search rely on it.
 * Artists without a thumbnail ({@link PLACEHOLDER_THUMB}) get a centred folder
 * icon instead of the folder overlay used on real thumbnails.
 *
 * @param {string} artistName - Artist name (becomes the card id and the alt text).
 * @param {string} thumb - Thumbnail path as returned by artists.php
 *   ("../thumbs/..." or {@link PLACEHOLDER_THUMB}).
 * @returns {HTMLDivElement} The card element, already in the gallery.
 */
function generateCard(artistName, thumb) {
  const isPlaceholder = thumb === PLACEHOLDER_THUMB;

  const container = document.createElement("div");
  container.className = "img-div";

  const img = document.createElement("img");
  img.alt = `picture by ${artistName}`;
  // Set the handler before the source so a cached image cannot be missed
  img.onload = () => {
    if (img.naturalHeight >= SMALL_IMAGE_HEIGHT) return;

    if (isPlaceholder) {
      // Vertically centre the icon (its width is fixed below)
      img.style.height = "80%";
      img.style.position = "absolute";
      img.style.top = "10%";
    } else {
      img.style.width = "unset";
      img.style.height = "100%";
    }
    container.style.display = "flex";
    container.style.justifyContent = "center";
  };
  img.src = toHostUrl(thumb);
  container.appendChild(img);

  if (isPlaceholder) {
    img.style.width = ICON_WIDTH;
  } else {
    const overlay = document.createElement("div");
    overlay.className = "folder";
    container.appendChild(overlay);
  }

  const card = document.createElement("div");
  card.className = "card";
  card.id = artistName;
  card.appendChild(container);

  document.querySelector("#gallery").appendChild(card);
  return card;
}

/**
 * Creates the preview of one artwork file and appends it to the gallery.
 *
 * What is shown depends on the file extension:
 * - pictures: the generated .webp thumbnail, wrapped in a link to the original
 * - videos / audio: a generic icon replaced by a native player
 * - text files: a generic icon
 * - anything else: the file itself, used as an image
 *
 * A preview for the same file replaces the previous one (matched by `id`), so
 * calling this twice for a file never creates a duplicate.
 *
 * @param {string} link - Server-relative path of the original file,
 *   e.g. "../commissions/Artist/pic.png".
 * @returns {HTMLDivElement} The preview element, already in the gallery.
 */
function generatePreview(link) {
  const extension = getExtension(link);
  const isPicture = pictureTypes.includes(extension);
  const fileUrl = toHostUrl(link);

  const img = document.createElement("img");
  img.alt = `Preview for ${fileUrl}`;

  /** @type {HTMLVideoElement|HTMLAudioElement|null} Native player, for media files. */
  let player = null;

  if (isPicture) {
    img.src = `${link.replace("../commissions/", `${host}thumbs/`)}.webp`;
  } else if (videoTypes.includes(extension)) {
    img.src = "./assets/img/film.png";
    img.style.width = ICON_WIDTH;

    const source = document.createElement("source");
    source.type = `video/${extension}`;
    source.src = fileUrl;

    player = document.createElement("video");
    player.appendChild(source);
  } else if (audioTypes.includes(extension)) {
    img.src = "./assets/img/music.png";

    player = document.createElement("audio");
    player.src = fileUrl;
  } else if (textTypes.includes(extension)) {
    img.src = "./assets/img/file.png";
    img.style.width = ICON_WIDTH;
  } else {
    img.src = fileUrl;
  }

  if (player) {
    player.controls = true;
    player.preload = "metadata";
  }

  // Pictures link to the original (with a zoom overlay); other files are not clickable
  let container;
  if (isPicture) {
    container = document.createElement("a");
    container.href = fileUrl;
    container.target = "_blank";
    container.rel = "noopener";

    const zoom = document.createElement("div");
    zoom.className = "zoom";
    container.appendChild(zoom);
  } else {
    container = document.createElement("div");
  }
  container.className = "img-div";
  container.appendChild(img);

  if (player) {
    img.style.display = "none"; // the player replaces the icon
    container.appendChild(player);
  }

  img.onload = () => {
    if (img.naturalHeight >= SMALL_IMAGE_HEIGHT) return;

    Object.assign(img.style, { width: "unset", height: "100%" });
    Object.assign(container.style, { display: "flex", justifyContent: "center" });
  };

  // The id identifies the file (last two path segments, spaces removed)
  const preview = document.createElement("div");
  preview.className = "preview";
  preview.id =
    link.split("/").slice(-2).join("").replaceAll(" ", "") || Date.now().toString();
  preview.appendChild(container);

  document.getElementById(preview.id)?.remove(); // replace an earlier preview of the same file
  document.querySelector("#gallery").appendChild(preview);
  return preview;
}

// *** Small builders ***

/**
 * Creates the SFW / NSFW filter: a radio group with two options.
 * @returns {HTMLDivElement} The `.content-filters` container.
 */
function createFilterToggle() {
  const container = document.createElement("div");
  container.className = "content-filters";
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", "Content filter");
  container.appendChild(createFilterOption("sfw", "false"));
  container.appendChild(createFilterOption("nsfw", "true"));
  return container;
}

/**
 * Creates the content-level filter: a dropdown with one option per entry of
 * {@link NSFW_LEVELS}. The `<select>` has id `nsfwLevel`; wiring and the initial
 * selection are done by reloadFiltersButtons().
 * @returns {HTMLDivElement} The `.content-filters` container.
 */
function createFilterDropdown() {
  const select = document.createElement("select");
  select.id = "nsfwLevel";
  select.name = "nsfw";
  select.setAttribute("aria-label", "Content filter");

  for (const { value, label } of NSFW_LEVELS) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    select.appendChild(option);
  }

  const container = document.createElement("div");
  container.className = "content-filters";
  container.appendChild(select);
  return container;
}

/**
 * Creates one option of the SFW/NSFW filter: a radio button and its label,
 * wrapped in a span.
 *
 * The label is visual only (aria-hidden); the radio carries its own aria-label.
 * Clicks are wired by reloadFiltersButtons() (utilities.js).
 *
 * @param {string} id - Id of the radio button, "sfw" or "nsfw". Also used, in
 *   upper case, as the label text.
 * @param {string} value - Value of the radio button, "true" for NSFW else "false".
 * @returns {HTMLSpanElement}
 */
function createFilterOption(id, value) {
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "nsfw";
  input.id = id;
  input.value = value;
  input.setAttribute("aria-label", id.toUpperCase());

  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = id.toUpperCase();
  label.setAttribute("aria-hidden", "true");

  const wrapper = document.createElement("span");
  wrapper.setAttribute("role", "none");
  wrapper.append(input, label);
  return wrapper;
}