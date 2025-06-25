/**
 * Reloads the current page using browser's location API.
 * @function reloadPage
 */
function reloadPage() {
  location.reload();
}

/**
 * Capitalizes the first letter of a string and converts the rest to lowercase.
 * @function ucFirst
 * @param {string} string - The input string to transform
 * @returns {string} Transformed string with first letter capitalized
 * @example
 * ucFirst('hello');    // Returns 'Hello'
 * ucFirst('HELLO');    // Returns 'Hello'
 * ucFirst('');         // Returns ''
 * @note Gracefully handles empty strings by returning empty string
 * @warning Expects string input - no type validation performed
 */
function ucFirst(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Dynamically sets document title based on URL parameters.
 * @function setPageTitle
 * @description Uses "artist" query parameter if present (capitalized via ucFirst()),
 * defaults to "Welcome | ComEx" when no artist parameter exists.
 * @example
 * // URL: https://example.com/?artist=picasso
 * // Sets title to "Picasso | ComEx"
 */
function setPageTitle() {
  const searchParams = new URLSearchParams(window.location.search);
  const artist = searchParams.get("artist");
  document.title = artist ? `${ucFirst(artist)} | ComEx` : "Welcome | ComEx";
  document.querySelector("meta[name='description']").content = artist 
    ? `Commissions by ${artist}` 
    : `Explore and manage commissions effortlessly with ComEx.`;
}

/**
 * Determines if current page is the welcome page.
 * @function isWelcomePage
 * @returns {boolean} True if document title matches welcome page title
 * @example
 * // When title is "Welcome | ComEx"
 * isWelcomePage();  // Returns true
 */
function isWelcomePage() {
  return document.title === "Welcome | ComEx";
}

/**
 * Sets NSFW (Not Safe For Work) flag based on URL parameters.
 * @function setIsNsfw
 * @description Checks both welcome page status and "isNsfw" query parameter.
 * Modifies global `isNsfw` variable.
 * @note Requires `isWelcomePage()` to be true for NSFW flag activation
 */
function setIsNsfw() {
  const searchParams = new URLSearchParams(window.location.search);
  isNsfw = isWelcomePage() && searchParams.get("isNsfw") === "true";
}

/**
 * Clears suggestion list and resets UI elements.
 * @function emptySuggestions
 * @description Performs three main actions:
 * 1. Removes all child elements from suggestions list
 * 2. Hides suggestions container and backdrop
 * 3. Clears results text
 */
function emptySuggestions() {
  const suggestions = document.querySelector("#suggestions");
  suggestions.innerHTML = "";
  suggestions.classList.remove("show");
  document.querySelector("#backdrop").classList = "";
  document.querySelector("#results").innerText = "";
}

/**
 * Handles keyboard navigation in suggestions list.
 * @function navigateSuggestions
 * @param {KeyboardEvent} event - Keyboard event object
 * @returns {boolean} True if navigation occurred, false otherwise
 * @description Supports:
 * - ArrowDown: Select next item
 * - ArrowUp: Select previous item
 * - Enter: Activate current selection
 * @note Prevents default behavior for arrow keys to avoid page scrolling
 */
function navigateSuggestions(event) {
  const suggestionsList = document.getElementById("suggestions");
  const items = suggestionsList.querySelectorAll("li");
  if (!items.length) return false;

  const currentSelected = suggestionsList.querySelector(".selected");
  let index = Array.from(items).indexOf(currentSelected);

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      index = (index + 1) % items.length;
      break;
    case "ArrowUp":
      event.preventDefault();
      index = (index - 1 + items.length) % items.length;
      break;
    case "Enter":
      if (currentSelected) accessSuggestion(currentSelected.innerText);
      return true;
    default:
      return false;
  }

  items.forEach(item => item.classList.remove("selected"));
  items[index].classList.add("selected");
  setTimeout(() => items[index].scrollIntoView({ behavior: "smooth", block: "nearest" }), 10);
  return true;
}

/**
 * Handles click events on suggestion elements and triggers suggestion access.
 * @function transmitClick
 * @param {MouseEvent} event - The mouse event from suggestion click
 * @description Acts as an event handler bridge between UI clicks and suggestion system
 * @example
 * // HTML
 * <li onclick="transmitClick(event)">Artist Name</li>
 */
function transmitClick(event) {
  accessSuggestion(event.currentTarget.innerText);
}

/**
 * Processes artist suggestion selection and resets search interface.
 * @function accessSuggestion
 * @param {string} artistName - The selected artist name
 * @description Performs three main actions:
 * 1. Sets search field value to selected artist
 * 2. Triggers unique suggestion display
 * 3. Clears search field for future interactions
 * @note Temporarily shows selected artist in search field before clearing
 */
function accessSuggestion(artistName) {
  const searchField = document.querySelector("#search");
  searchField.value = artistName;
  showUniqueSuggestion();
  searchField.value = "";
}

// *** Content Loading Functions ***

/**
 * Controls initial page content setup based on current page state.
 * @function loadContent
 * @description Orchestrates page layout by:
 * - Resetting gallery container
 * - Adjusting page margins
 * - Managing return button visibility
 * - Routing to appropriate content loader (artists/artworks)
 * - Always showing navigation bar
 * @see loadArtists
 * @see loadArtworks
 */
function loadContent() {
  const gallery = document.querySelector("#gallery");
  const isWelcome = isWelcomePage();
  gallery.innerHTML = isWelcome ? "<span class='push'></span>" : "";
  gallery.style.marginTop = isWelcome ? "" : "unset";
  showReturnButton(!isWelcome);

  if (isWelcome) {
    loadArtists();
  } else {
    loadArtworks();
  }
  showNavBar();
}

/**
 * Loads and displays artist cards from server with progress tracking.
 * @function loadArtists
 * @description Implements:
 * - NSFW flag initialization
 * - Loading spinner activation
 * - Batch artist card generation
 * - Progress counter updates
 * - Error handling and cleanup
 * - Search input initialization
 * @note Uses global `host` variable for API endpoint
 * @warning Modifies DOM extensively through card generation
 */
function loadArtists() {
  setIsNsfw();
  const spinner = document.querySelector("#spinner");
  spinner.classList.add("loading");

  fetch(`${host}api/artists.php?isNsfw=${isNsfw}`)
    .then(res => res.json())
    .then(artists => {
      const spinnerNumber = document.querySelector("#spinnerNumber");
      const artistKeys = Object.keys(artists);
      spinnerNumber.innerText = `0 / ${artistKeys.length}`;

      artistKeys.forEach((artistName, idx) => {
        spinnerNumber.innerText = `${idx + 1} / ${artistKeys.length}`;
        const card = generateCard(artistName, artists[artistName]);
        addClick(card, goToArtist);
      });
    })
    .catch(err => console.error("Failed to update artist list:", err.message))
    .finally(() => {
      spinner.classList.remove("loading");
      document.querySelector("#spinnerNumber").innerText = "";
      addInput(document.querySelector("#search"), showSuggestions);

      if (document.querySelector("#search").value) {
        setTimeout(showUniqueSuggestion, 500);
      }
    });
}

/**
 * Loads artwork data for specific artist with thumbnail processing.
 * @function loadArtworks
 * @async
 * @description Handles:
 * - Artist parameter extraction from URL
 * - Artwork data fetching via POST
 * - Path processing for artwork files
 * - Progress tracking visualization
 * - Thumbnail population with delay
 * @note Uses 250ms delay before thumbnail display for UI smoothness
 */
async function loadArtworks() {
  const searchParams = new URLSearchParams(window.location.search);
  const artist = searchParams.get("artist");

  try {
    const response = await fetch(`${host}api/artworks.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ artist }),
    });
    const artworks = await response.json();
    const processedArtworks = artworks.map(artwork => artwork.split("/").slice(1).join("/"));
    await progress("thumbnails", artist);
    setTimeout(() => setThumbnails(artist, processedArtworks), 250);
  } catch (err) {
    console.error("Failed to update artworks list:", err.message);
  } finally {
    document.querySelector("#spinnerNumber").innerHTML = "";
  }
}

/**
 * Tracks and displays progress of long-running operations.
 * @function progress
 * @async
 * @param {string} action - The operation type being tracked (e.g., 'thumbnails')
 * @param {string} artist - Target artist for progress tracking
 * @description Provides:
 * - Visual loading indicators
 * - Percentage progress updates
 * - Activity monitoring dots for stalled progress
 * - Server communication for progress data
 * @example
 * await progress("processing", "van-gogh");
 */
async function progress(action, artist) {
  const spinner = document.querySelector("#spinner");
  const spinnerNumber = document.querySelector("#spinnerNumber");
  const progressMore = document.querySelector("#progressMore");

  if (!spinner.classList.contains("loading")) {
    spinner.classList.add("loading");
  }

  try {
    const response = await fetch(`${host}api/progress.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action, artist }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const progressValue = await response.json();
    const percentage = Math.round(progressValue * 10000) / 100;
    const currentPercentage = parseFloat(spinnerNumber.textContent);

    if (currentPercentage === percentage) {
      progressMore.textContent = progressMore.textContent.length === 23 ? "." : progressMore.textContent + ".";
    } else {
      spinnerNumber.textContent = `${percentage}%`;
      progressMore.textContent = "";
    }

    console.debug(`${artist}: ${percentage}%`);
  } catch (err) {
    console.error("Progress update failed:", err.message);
    spinner.classList.remove("loading");
  }
}

/**
 * Manages thumbnail generation and display for artist artworks.
 * @async
 * @function setThumbnails
 * @param {string} artist - Artist name for thumbnail processing
 * @param {Array<string>} artworks - Array of artwork file paths
 * @description Handles:
 * - Progress indicator initialization
 * - Batch thumbnail processing via API
 * - Progress percentage updates
 * - Final preview generation
 * - Error handling and cleanup
 * @example
 * await setThumbnails('vangogh', ['/paintings/starry-night.jpg']);
 */
async function setThumbnails(artist, artworks) {
  const spinner = document.querySelector("#spinner");
  const spinnerNumber = document.querySelector("#spinnerNumber");

  spinnerNumber.textContent = "0%";
  spinner.classList.add("loading");
  console.debug(`${artist}: 0% - Start`);

  try {
    for (const artwork of artworks) {
      const response = await fetch(`${host}api/thumbnail.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworks: [artwork] }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await progress("thumbnails", artist);
    }

    artworks.forEach(artwork => generatePreview(`../${artwork}`));
    console.debug(`${artist}: 100% - End`);
    spinnerNumber.textContent = "100%";
  } catch (error) {
    console.error("Gallery load failed:", error.message);
  } finally {
    spinner.classList.remove("loading");
  }
}

/**
 * Checks for newly added artists via API.
 * @function checkNew
 * @description Performs:
 * - Loading indicator activation
 * - New artist detection
 * - Console logging of results
 * - Silent failure on errors
 * @note Does not update UI - only logs results to console
 */
function checkNew() {
  const spinner = document.querySelector("#spinner");
  spinner.classList.add("loading");

  fetch(`${host}api/new.php`)
    .then(res => res.json())
    .then(artists => {
      if (artists.length > 0) console.debug(artists);
    })
    .catch(err => console.log("Failed to check new artists:", err.message))
    .finally(() => {
      spinner.classList.remove("loading");
    });
}

// *** UI Visibility Controllers ***

/**
 * Resets filter buttons to reflect current NSFW state.
 * @function reloadFiltersButtons
 * @param {HTMLElement} root - Container element for filter controls
 * @description Updates:
 * - Radio button selection state
 * - Click event handlers for filter buttons
 * @warning Modifies DOM event listeners - ensure proper cleanup
 */
function reloadFiltersButtons(root) {
  root.querySelector(`input[type='radio'][value='${isNsfw}']`).defaultChecked = true;
  root.querySelectorAll("span > label").forEach(btn => addClick(btn, changeFilter));
}

/**
 * Controls return button visibility and functionality.
 * @function showReturnButton
 * @param {boolean} showReturnButton - Toggle button visibility
 * @description Manages:
 * - Hidden attribute state
 * - Click handler attachment/removal
 * - Navigation behavior through returnIndex()
 */
function showReturnButton(showReturnButton) {
  const returnBtn = document.getElementById("returnBtn");
  if (showReturnButton) {
    returnBtn.removeAttribute("hidden");
    addClick(returnBtn, returnIndex);
  } else {
    returnBtn.setAttribute("hidden", "hidden");
  }
}

/**
 * Toggles navigation bar visibility based on page state.
 * @function showNavBar
 * @description Uses isWelcomePage() check to determine visibility
 * @see isWelcomePage
 */
function showNavBar() {
  const nav = document.querySelector("nav");
  if (isWelcomePage()) {
    nav.removeAttribute("hidden");
  } else {
    nav.setAttribute("hidden", "hidden");
  }
}

/**
 * Handles real-time search suggestions and card filtering.
 * @function showSuggestions
 * @param {Event} event - Input event from search field
 * @description Implements:
 * - Search term normalization
 * - Card visibility filtering
 * - Suggestion list population
 * - Result count display
 * - Keyboard navigation setup
 * @note Clears previous suggestions with emptySuggestions()
 */
function showSuggestions(event) {
  emptySuggestions();
  const search = event.currentTarget.value.toLowerCase();
  const cards = document.querySelectorAll(".card");

  if (search && cards.length > 1) {
    cards.forEach((card, idx) => {
      const cardName = card.id.trim().toLowerCase();
      const included = cardName.startsWith(search);

      card.dataset.hidden = !included;
      card.classList.remove("searched");

      if (included) {
        const li = document.createElement("li");
        li.innerHTML = cardName;
        li.dataset.card = `#${cardName}`;
        li.dataset.pos = idx;
        document.querySelector("#suggestions").appendChild(li);
        addClick(li, transmitClick);
      }
    });

    document.querySelector("#backdrop").classList = "show";
    document.querySelector("#results").innerText = `${document.querySelector("#suggestions").childElementCount} / ${cards.length}`;
    addKeyDown(event.currentTarget, navigateSuggestions);
  }
}

/**
 * Highlights and scrolls to exact match card based on search input.
 * @function showUniqueSuggestion
 * @description Handles:
 * - Search term normalization
 * - Exact match card highlighting
 * - Smooth scroll to matching card
 * - Automatic suggestion list cleanup
 * @example
 * // When search matches exact card ID
 * showUniqueSuggestion(); // Scrolls to card and hides others
 */
function showUniqueSuggestion() {
  const searchTerm = document.querySelector("#search").value.trim().toLowerCase();
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    if (card.id.toLowerCase() === searchTerm) {
      card.classList.add("searched");
      setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "nearest" }), 10);
      emptySuggestions();
    } else {
      card.dataset.hidden = true;
    }
  });
}

// *** Navigation Controllers ***

/**
 * Toggles NSFW content filter state and updates UI.
 * @function changeFilter
 * @param {Event} event - Click event from filter button
 * @description Implements:
 * - State comparison to prevent redundant updates
 * - History API integration for state management
 * - URL parameter synchronization
 * - Search field reset
 * @note Maintains page identifier through global 'page' variable
 */
function changeFilter(event) {
  const newNsfwState = event.currentTarget.innerText === "NSFW"; // Determine new NSFW state based on button text
  if (isNsfw !== newNsfwState) { // Only proceed if the state has changed
    const state = { data: "optional state object" }; // Create a state object for history
    const title = `Welcome | ComEx`; // Set the new title
    const searchParams = new URLSearchParams(window.location.search); // Get current URL parameters
    searchParams.set("isNsfw", newNsfwState); // Update the NSFW parameter

    const newUrl = `/_CommissionExplorer/${page}?${searchParams.toString()}`; // Construct the new URL
    history.pushState(state, title, newUrl); // Push the new state to history
    document.querySelector("#search").value = ""; // Clear the search field
  }
}

/**
 * Navigates to artist-specific view with state management.
 * @function goToArtist
 * @param {Event} event - Click event from artist card
 * @description Handles:
 * - Artist parameter injection into URL
 * - Page title updates
 * - Browser history state preservation
 * @see setPageTitle
 */
function goToArtist(event) {
  const state = { data: "optional state object" }; // Create a state object for history
  const title = `${event.currentTarget.id} | ComEx`; // Set the new title based on the artist's ID
  const searchParams = new URLSearchParams(window.location.search); // Get current URL parameters
  searchParams.set("artist", event.currentTarget.id); // Update the artist parameter

  const newUrl = `/_CommissionExplorer/${page}?${searchParams.toString()}`; // Construct the new URL
  history.pushState(state, title, newUrl); // Push the new state to history
  window.document.title = title;
  setPageTitle(); // Update the page title
}

/**
 * Returns to main index view from artist page.
 * @function returnIndex
 * @description Manages:
 * - Artist parameter removal from URL
 * - Search field preservation of current artist
 * - History state reset
 * - Title restoration
 * @note Maintains artist name in search field for quick re-search
 */
function returnIndex() {
  const artist = document.title.split("|")[0].trim(); // Extract the artist name from the title
  const state = { data: "optional state object" }; // Create a state object for history
  const title = "Welcome | ComEx"; // Set the new title
  const searchParams = new URLSearchParams(window.location.search); // Get current URL parameters
  searchParams.delete("artist"); // Remove the artist parameter

  const newUrl = `/_CommissionExplorer/${page}?${searchParams.toString()}`; // Construct the new URL
  history.pushState(state, title, newUrl); // Push the new state to history
  window.document.title = title;
  setPageTitle(); // Update the page title
  document.querySelector("#search").value = artist; // Set the search field value to the artist name
}