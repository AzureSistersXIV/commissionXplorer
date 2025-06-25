// Define supported file types for pictures, videos, audio, and text
const pictureTypes = ["jpg", "jpeg", "png", "gif"];
const videoTypes = ["mp4", "mov", "avi"];
const audioTypes = ["wav", "mp3"];
const textTypes = ["txt", "md"];

/**
 * Generates the header content structure with enhanced accessibility features
 * @param {HTMLElement} root - The container element to append the main content to
 */
function generateHeader(root) {
  // Create return button with accessibility features
  const btn = document.createElement("button");
  btn.id = "returnBtn";
  btn.innerText = "Return";
  // ARIA attributes for button
  btn.setAttribute("aria-label", "Return to previous page");
  btn.setAttribute("aria-keyshortcuts", "Alt+ArrowLeft");
  btn.setAttribute("role", "button"); // Redundant but explicit for screen readers
  btn.setAttribute("tabindex", "0"); // Ensure keyboard focusability

  // Container for button (semantic grouping)
  const span = document.createElement("span");
  span.setAttribute("role", "group");
  span.setAttribute("aria-label", "Navigation controls");
  span.appendChild(btn);

  // Main title with accessibility features
  const h1 = document.createElement("h1");
  h1.id = "ComExTitle";
  h1.innerText = "ComEx";
  // ARIA attributes for heading
  h1.setAttribute("aria-level", "1");
  h1.setAttribute("role", "heading");
  h1.setAttribute("aria-roledescription", "Site title");

  // Header element with landmark role
  const header = document.createElement("header");
  header.setAttribute("role", "banner");
  header.setAttribute("aria-labelledby", "Comex");
  header.setAttribute("aria-label", "Comex header");

  // Build DOM structure
  header.appendChild(h1);
  header.appendChild(span);
  root.appendChild(header);
}

/**
 * Generates the main content structure with enhanced accessibility features
 * @param {HTMLElement} root - The container element to append the main content to
 */
function generateMain(root) {
  // NSFW/SFW Toggle Section
  // Radio button group for content filtering
  const sfwInput = createRadioInput("sfw", "false");
  const sfwLabel = createLabel(sfwInput.id);
  const sfwBtn = createSpan(sfwInput, sfwLabel);

  const nsfwInput = createRadioInput("nsfw", "true");
  const nsfwLabel = createLabel(nsfwInput.id);
  const nsfwBtn = createSpan(nsfwInput, nsfwLabel);

  const contentFilters = document.createElement("div");
  contentFilters.className = "content-filters";
  contentFilters.setAttribute("role", "radiogroup");
  contentFilters.setAttribute("aria-label", "Content filter");
  contentFilters.appendChild(sfwBtn);
  contentFilters.appendChild(nsfwBtn);

  // Reload filter buttons
  reloadFiltersButtons(contentFilters);

  // Parse URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.size === 0) {
    contentFilters.setAttribute("style", "display:none");
  }

  // Search Results Counter
  // Accessible live region for dynamic updates
  const count = document.createElement("div");
  count.name = "results";
  count.id = count.name;
  count.setAttribute("aria-live", "polite");
  count.setAttribute("aria-atomic", "true");

  const resultsPart = document.createElement("span");
  resultsPart.appendChild(count);

  // Search Interface
  // Accessible search input with suggestions
  const search = document.createElement("input");
  search.name = "search";
  search.id = search.name;
  search.type = "text";
  search.placeholder = "Search...";
  search.setAttribute("aria-label", "Search content");
  search.setAttribute("autocomplete", "off");
  search.setAttribute("role", "searchbox");

  const inputPart = document.createElement("span");
  inputPart.appendChild(search);

  const suggestions = document.createElement("ul");
  suggestions.id = "suggestions";
  suggestions.setAttribute("role", "list");
  suggestions.setAttribute("aria-label", "Search suggestions");

  const suggestionsPart = document.createElement("span");
  suggestionsPart.appendChild(suggestions);

  const searchbar = document.createElement("div");
  searchbar.className = "search-bar";
  searchbar.setAttribute("role", "search");
  searchbar.appendChild(resultsPart);
  searchbar.appendChild(inputPart);
  searchbar.appendChild(suggestionsPart);

  // Main Navigation
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Main navigation");
  nav.appendChild(contentFilters);
  nav.appendChild(searchbar);

  // Image Gallery Container
  // Accessible landmark for content
  const gallery = document.createElement("div");
  gallery.id = "gallery";
  gallery.setAttribute("role", "region");
  gallery.setAttribute("aria-label", "Content gallery");
  if (document.title !== "Welcome | ComEx") {
    gallery.style.marginTop = "0rem";
  }

  // Loading Indicators
  // Accessible status messages
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

  const spinnersContainer = document.createElement("div");
  spinnersContainer.id = "spinner";
  spinnersContainer.className = spinnersContainer.id;
  spinnersContainer.appendChild(spinnerLoad);
  spinnersContainer.appendChild(spinnerNumber);

  // Modal Backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-hidden", "true");

  // Main Content Assembly
  const main = document.createElement("main");
  main.setAttribute("role", "main");
  main.appendChild(nav);
  main.appendChild(gallery);
  main.appendChild(spinnersContainer);
  main.appendChild(backdrop);

  root.appendChild(main);
}

/**
 * Generates a card element for an artist with a thumbnail image
 * @param {string} artistName - The name of the artist
 * @param {string} thumb - The URL of the thumbnail image
 * @returns {HTMLElement} The generated card element
 */
function generateCard(artistName, thumb) {
  // Image element setup
  const img = document.createElement("img");
  img.src = thumb.replace("..", host);
  img.alt = `picture by ${artistName}`;

  // Special handling for placeholder image
  if (thumb === "./assets/img/folder.png") {
    img.style.width = "200px";
  }

  // Container element creation
  const container = document.createElement("div");
  container.className = "img-div";
  container.appendChild(img);

  // Card element assembly
  const div = document.createElement("div");
  div.className = "card";
  div.id = artistName;
  div.appendChild(container);

  // Image load handler for layout adjustments
  img.onload = function () {
    if (img.naturalHeight < 250) {
      img.style.width = "unset";
      img.style.height = "100%";
      container.style.display = "flex";
      container.style.justifyContent = "center";
    }
  };

  // Append card to gallery
  document.querySelector("#gallery").appendChild(div);
  return div;
}

/**
 * Generates a preview element for a given link
 * @param {string} link - The URL of the content to preview
 * @returns {HTMLElement} The generated preview element
 */
function generatePreview(link) {
  // Helper function to get the file extension from a link
  const getExtension = (link) => {
    const filename = link.split("/").pop() || "";
    return filename.split(".").pop().toLowerCase();
  };

  const img = document.createElement("img");
  const extension = getExtension(link);

  let addon;

  // Configure image based on type
  switch (true) {
    case pictureTypes.includes(extension):
      img.src = link.replace("../commissions/", host + "/thumbs/");
      break;
    case videoTypes.includes(extension):
      img.src = "./assets/img/film.png";
      img.style.width = "200px";
      addon = document.createElement("video");
      addon.setAttribute("controls", null);
      addon.preload = "metadata";
      const source = document.createElement("source");
      source.type = "video/" + extension;
      source.src = link;
      addon.appendChild(source);
      break;
    case audioTypes.includes(extension):
      img.src = "./assets/img/music.png";
      addon = document.createElement("audio");
      addon.setAttribute("controls", null);
      addon.src = link;
      addon.preload = "metadata";
      break;
    case textTypes.includes(extension):
      img.src = "./assets/img/file.png";
      img.style.width = "200px";
      break;
    default:
      img.src = link;
  }
  img.alt = `Preview for ${link}`;

  // Create and append elements
  const container = document.createElement("a");
  container.className = "img-div";
  container.href = link;
  container.target = "_blank";
  container.append(img);
  if (addon !== undefined) {
    img.style.display = "none";
    container.append(addon);
  }

  const previewDiv = document.createElement("div");
  previewDiv.className = "preview";
  previewDiv.id =
    link.split("/").splice(-2).join("").replaceAll(" ", "") ||
    Date.now().toString();
  previewDiv.append(container);

  // Image load handler for layout adjustments
  img.onload = () => {
    if (img.naturalHeight < 250) {
      Object.assign(img.style, {
        width: "unset",
        height: "100%",
      });
      Object.assign(container.style, {
        display: "flex",
        justifyContent: "center",
      });
    }
  };

  // Remove existing preview if it exists
  if (
    document.getElementById(previewDiv.id) !== null &&
    document.getElementById(previewDiv.id) !== undefined
  ) {
    document
      .querySelector("#gallery")
      .removeChild(document.getElementById(previewDiv.id));
  }

  // Append preview to gallery
  document.querySelector("#gallery").append(previewDiv);
}

/**
 * Creates a radio input element with specified id and value
 * @param {string} id - The id of the input element
 * @param {string} value - The value of the input element
 * @returns {HTMLInputElement} The created radio input element
 */
function createRadioInput(id, value) {
  const input = document.createElement("input");
  input.name = "nsfw";
  input.id = id;
  input.type = "radio";
  input.value = value;
  input.setAttribute("aria-checked", "false");
  input.setAttribute("role", "radio");
  input.setAttribute("tabindex", "0");
  return input;
}

/**
 * Creates a label element for the specified input id
 * @param {string} inputId - The id of the input element
 * @returns {HTMLLabelElement} The created label element
 */
function createLabel(inputId) {
  const label = document.createElement("label");
  label.htmlFor = inputId;
  label.innerText = inputId.toUpperCase();
  label.setAttribute("aria-hidden", "true");
  return label;
}

/**
 * Creates a span element containing the specified input and label elements
 * @param {HTMLInputElement} input - The input element to include in the span
 * @param {HTMLLabelElement} label - The label element to include in the span
 * @returns {HTMLSpanElement} The created span element
 */
function createSpan(input, label) {
  const span = document.createElement("span");
  span.setAttribute("role", "none");
  span.appendChild(input);
  span.appendChild(label);
  return span;
}
