// Global variable to store the total number of commissions.
let totalCommissions = 0;
let totalParts = [];
let sortStates = {
  artists: { order: [], type: "desc" },
};

/**
 * Main initialization
 * This event listener waits for the DOM content to be fully loaded before executing the `getStats` function.
 */
document.addEventListener("DOMContentLoaded", () => {
  createLoad();
  getStats();
  preventContextualMenu();
});

function createLoad() {
  // Create a loader element to indicate loading state
  let loader = document.createElement("div");
  loader.classList = "spinner"; // Assign a spinner class for styling
  document.body.appendChild(loader); // Append the loader to the document body
}

/**
 * Fetches statistics from the API and generates the UI components.
 *
 * This function performs the following steps:
 * 1. Fetches data from the API endpoint.
 * 2. Parses the response as JSON.
 * 3. Calls `generatePanels` to create the main dashboard panels.
 * 4. Calls `generateArtistsPanel` to create individual artist panels.
 * 5. Handles errors using `handleError`.
 * 6. Logs a debug message when the process is complete.
 */
function getStats() {
  // Toggle the loading spinner visibility
  document.querySelector(".spinner").classList.toggle("loading");

  // Fetch statistics data from the API
  fetch("https://naslku.synology.me/_CommissionExplorerAPI/api/stats.php")
    .then((res) => res.json()) // Parse the response as JSON
    .then((stats) => {
      if (stats.error) {
        const error = document.createElement("div");
        error.classList = "panel";
        error.id = "Error";
        error.innerHTML = '<div class="stat">' + stats.error + "</div>";
        document.body.appendChild(error);

        return;
      }

      // Store the count of SFW and NSFW commissions
      totalParts = [stats.sfw.commissions.count, stats.nsfw.commissions.count];

      // Generate the main dashboard panels
      generatePanels(stats);

      // Add a horizontal line for visual separation
      document.body.innerHTML += "<hr>";

      // Generate the artists table
      generateArtistsTable(stats);
    })
    .catch(handleError) // Handle any errors during the fetch process
    .finally(() => {
      console.debug("Stats checked."); // Log a debug message
      // Toggle the loading spinner visibility
      document.querySelector(".spinner").classList.toggle("loading");
    });
}

/**
 * Error handling utility
 *
 * @param {Error} error - The error object containing details about the failure.
 * Logs the error message to the console.
 */
function handleError(error) {
  // Log the error message to the console
  console.error("Failed to check stats:", error.message);
}

/**
 * Generates all dashboard panels based on the provided statistics.
 *
 * @param {object} stats - The statistics object containing SFW and NSFW data.
 * The `stats` object is expected to have the following structure:
 * {
 *   sfw: { artists: { count: number }, commissions: { count: number }, thumbnails: { count: number } },
 *   nsfw: { artists: { count: number }, commissions: { count: number }, thumbnails: { count: number } }
 * }
 */
function generatePanels(stats) {
  // Generate the "Total" panel with combined statistics.
  generatePanel({
    id: "Total",
    sections: [
      createToggleSection("Artistes", stats, "artists"), // Toggle section for artists.
      createToggleSection("Commissions", stats, "commissions"), // Toggle section for commissions.
      createImageRatioSection(stats), // Image ratio section.
    ],
  });

  // Generate the "SFW" panel with SFW-specific statistics.
  generatePanel({
    id: "SFW",
    sections: [
      createStatItem("Artistes", stats.sfw.artists.count), // SFW artist count.
      createStatItem("Commissions", stats.sfw.commissions.count), // SFW commission count.
      createImageSubsection(stats.sfw, "sfw"), // SFW image subsection.
    ],
  });

  // Generate the "NSFW" panel with NSFW-specific statistics.
  generatePanel({
    id: "NSFW",
    sections: [
      createStatItem("Artistes", stats.nsfw.artists.count), // NSFW artist count.
      createStatItem("Commissions", stats.nsfw.commissions.count), // NSFW commission count.
      createImageSubsection(stats.nsfw, "nsfw"), // NSFW image subsection.
    ],
  });
}

/**
 * Generic panel generator
 *
 * @param {object} config - Configuration object for the panel.
 * The `config` object should have the following structure:
 * {
 *   id: string, // Unique ID for the panel.
 *   sections: array // Array of HTML elements representing sections within the panel.
 * }
 */
function generatePanel(config) {
  // Create a panel container
  const panel = document.createElement("div");
  panel.className = "panel"; // Assign a class for styling
  panel.id = config.id; // Set the panel's unique ID

  // Add each section to the panel
  config.sections.forEach((section) => {
    const container = createContainer(); // Create a container for the section
    container.appendChild(section); // Append the section to the container
    panel.appendChild(container); // Append the container to the panel
  });

  // Append the panel to the document body
  document.body.appendChild(panel);
}

function generateArtistsTable(stats) {
  // Combine SFW and NSFW artist details into a single object
  let artists = {
    artists: {
      details: stats.sfw.artists.details.concat(stats.nsfw.artists.details),
    },
    commissions: {
      details: Object.entries(stats.sfw.commissions.details).concat(
        Object.entries(stats.nsfw.commissions.details)
      ),
    },
    thumbnails: {
      details: Object.entries(stats.sfw.thumbnails.details).concat(
        Object.entries(stats.nsfw.thumbnails.details)
      ),
    },
  };

  // Sort the details for consistent display
  artists.artists.details.sort();
  artists.commissions.details.sort();
  artists.thumbnails.details.sort();

  // Map SFW artists to a boolean array indicating their presence in SFW commissions
  artists.sfw = artists.artists.details
    .concat(stats.nsfw.artists.details)
    .map((artist) => {
      return artist in stats.sfw.commissions.details;
    });

  // Generate the table for displaying artist statistics
  generateTable(artists, "artists");
}

function generateTable(stats, label) {
  // Create a container for the table
  const container = document.createElement("div");
  container.classList = "table-container"; // Assign a class for styling
  document.body.appendChild(container);

  // Create a div for displaying search results
  const searchResults = document.createElement("div");
  searchResults.className = "search-results"; // Assign a class for styling
  searchResults.innerHTML = "&nbsp;"; // Initialize with a non-breaking space
  container.appendChild(searchResults);

  // Create the table element
  const table = document.createElement("table");
  table.className = "table"; // Assign a class for styling
  table.id = label; // Set the table's unique ID
  container.appendChild(table);

  // Create and append the table header
  const header = document.createElement("thead");
  table.appendChild(header);

  // Create and append the header row
  const headerRow = document.createElement("tr");
  header.appendChild(headerRow);

  // Create and append the search row
  const searchRow = document.createElement("tr");
  header.appendChild(searchRow);

  // Define the column headers and add them to the table
  [
    "Artist",
    "? sfw",
    "% Total",
    "% Type",
    "# Commissions",
    "# Pictures",
    "% Pics / Coms",
  ].forEach((header, idx) => {
    const th = document.createElement("th");
    th.textContent = header; // Set the header text
    th.addEventListener("click", clickHeader); // Add a click event listener for sorting
    headerRow.appendChild(th);

    const tdSearch = document.createElement("td");

    if (idx !== 1) {
      // Create an input field for searching
      const inputSearch = document.createElement("input");
      inputSearch.type = [0, 1].includes(idx) ? "text" : "number"; // Set the input type
      if (![0, 1].includes(idx)) {
        inputSearch.step = [3, 4].includes(idx) ? 1 : 0.01; // Set the step value for numeric inputs
        inputSearch.min = 0; // Set the minimum value
      }
      inputSearch.placeholder = header; // Set the placeholder text
      inputSearch.className = "search"; // Assign a class for styling
      inputSearch.addEventListener("input", searchColumn); // Add an input event listener for filtering
      tdSearch.appendChild(inputSearch);
    } else {
      // Create a dropdown for filtering
      const selectSearch = document.createElement("select");
      ["", "Yes", "No"].forEach((answer) => {
        let option = document.createElement("option");
        option.innerText = answer; // Set the option text
        option.value = answer; // Set the option value
        selectSearch.appendChild(option);
      });
      selectSearch.addEventListener("change", selectValue); // Add a change event listener for filtering
      tdSearch.appendChild(selectSearch);
    }

    searchRow.appendChild(tdSearch);
  });

  // Create and append the table body
  const body = document.createElement("tbody");
  table.appendChild(body);

  // Populate the table rows with artist data
  Object.entries(stats.artists.details).forEach(([idx, artist]) => {
    const commissions = stats.commissions.details[idx][1]; // Get the number of commissions
    const thumbnails = stats.thumbnails.details[idx][1]; // Get the number of thumbnails

    const row = document.createElement("tr");
    row.classList = idx % 2 === 0 ? "even" : "odd"; // Add alternating row classes
    row.innerHTML = `
            <td>${artist}</td>
            <td class='${stats.sfw[idx] ? "sfw" : "nsfw"}'>${
      stats.sfw[idx] ? "Yes" : "No"
    }</td>
            <td>${calculatePercentage(commissions, totalCommissions)}%</td>
            <td>${
              stats.sfw[idx]
                ? calculatePercentage(commissions, totalParts[0])
                : calculatePercentage(commissions, totalParts[1])
            }%</td>
            <td>${commissions}</td>
            <td>${thumbnails}</td>
            <td>${calculatePercentage(thumbnails, commissions)}%</td>`;
    body.appendChild(row); // Append the row to the table body
  });

  // Hide columns based on the initial filter value
  hideColumns(table.querySelector("select").value);
}

/**
 * Handles column search input events.
 * Filters table rows based on the input value in the search field.
 *
 * @param {Event} event - Input event from the search field.
 */
function searchColumn(event) {
  const td = event.currentTarget.parentElement; // Get the parent <td> of the input field.
  const col = Array.from(td.parentElement.children).findIndex(function (el) {
    return el === td; // Find the column index of the input field.
  });
  const searchValue = event.currentTarget.value.trim().toLowerCase(); // Normalize the search value.

  td.closest("table")
    .querySelectorAll(`tbody tr`) // Select all rows in the table body.
    .forEach((row) => {
      const fieldValue = [0, 2, 3, 6].includes(col)
        ? row
            .querySelector(`td:nth-child(${col + 1})`) // Get the cell in the current column.
            .innerText.trim()
            .substring(0, searchValue.length)
            .toLowerCase() // Normalize the cell value.
        : row
            .querySelector(`td:nth-child(${col + 1})`)
            .innerText.trim()
            .toLowerCase();

      let colArray;

      if (row.dataset.hidden !== undefined) {
        colArray = JSON.parse(row.dataset.hidden); // Parse the hidden column array if it exists.
      } else {
        colArray = []; // Initialize an empty array if it doesn't exist.
      }

      if (!fieldValue.includes(searchValue) && searchValue !== "") {
        if (!colArray.includes(col)) colArray.push(col); // Add the column index to the hidden array if it doesn't match.
      } else {
        const index = colArray.indexOf(col);
        if (index > -1) {
          colArray.splice(index, 1); // Remove the column index if it matches.
        }
      }

      row.dataset.hidden = JSON.stringify(colArray); // Update the hidden column array in the dataset.
    });

  hideRow(); // Hide rows based on the updated hidden column array.

  // Update the search results display.
  if (document.querySelectorAll("table tbody tr[hidden]").length > 0) {
    document.querySelector(".search-results").innerHTML = `Search results: ${
      document.querySelectorAll("table tbody tr").length -
      document.querySelectorAll("table tbody tr[hidden]").length
    } results`; // Display the number of matching results.
  } else {
    document.querySelector(".search-results").innerHTML = "&nbsp;"; // Clear the search results display.
  }
}

/**
 * Handles dropdown selection events for filtering.
 * Filters table rows based on the selected value in the dropdown.
 *
 * @param {Event} event - Change event from the dropdown.
 */
function selectValue(event) {
  const td = event.currentTarget.parentElement; // Get the parent <td> of the dropdown.
  const col = Array.from(td.parentElement.children).findIndex(function (el) {
    return el === td; // Find the column index of the dropdown.
  });
  const searchValue = event.currentTarget.value; // Get the selected value.

  td.closest("table")
    .querySelectorAll(`tbody tr`) // Select all rows in the table body.
    .forEach((row) => {
      const fieldValue = row.querySelector(
        `td:nth-child(${col + 1})`
      ).innerText; // Get the cell value in the current column.
      let colArray;

      if (row.dataset.hidden !== undefined) {
        colArray = JSON.parse(row.dataset.hidden); // Parse the hidden column array if it exists.
      } else {
        colArray = []; // Initialize an empty array if it doesn't exist.
      }

      if (!fieldValue.includes(searchValue) && searchValue !== "") {
        if (!colArray.includes(col)) colArray.push(col); // Add the column index to the hidden array if it doesn't match.
      } else {
        const index = colArray.indexOf(col);
        if (index > -1) {
          colArray.splice(index, 1); // Remove the column index if it matches.
        }
      }

      row.dataset.hidden = JSON.stringify(colArray); // Update the hidden column array in the dataset.
    });

  hideColumns(searchValue);

  hideRow(); // Hide rows based on the updated hidden column array.

  // Update the search results display.
  if (document.querySelectorAll("table tbody tr[hidden]").length > 0) {
    document.querySelector(".search-results").innerHTML = `Search results: ${
      document.querySelectorAll("table tbody tr").length -
      document.querySelectorAll("table tbody tr[hidden]").length
    } results`; // Display the number of matching results.
  } else {
    document.querySelector(".search-results").innerHTML = "&nbsp;"; // Clear the search results display.
  }
}

/**
 * Toggles row visibility based on search filters.
 */
function hideRow() {
  document.querySelectorAll("table tbody tr").forEach((row) => {
    if (row.dataset.hidden !== undefined) {
      const colArray = JSON.parse(row.dataset.hidden); // Parse the hidden column array.
      if (colArray.length > 0) {
        row.setAttribute("hidden", "hidden"); // Hide the row if the array is not empty.
      } else {
        row.removeAttribute("hidden"); // Show the row if the array is empty.
      }
    }
  });
}

function hideColumns(searchValue) {
  if (searchValue !== "") {
    Array.from(
      document.querySelectorAll(
        "table tr th:nth-child(3), table tr td:nth-child(3)"
      )
    ).forEach((element) => {
      element.style = "display: none";
    });
    Array.from(
      document.querySelectorAll(
        "table tr th:nth-child(4), table tr td:nth-child(4)"
      )
    ).forEach((element) => {
      element.style = "";
    });
  } else {
    Array.from(
      document.querySelectorAll(
        "table tr th:nth-child(3), table tr td:nth-child(3)"
      )
    ).forEach((element) => {
      element.style = "";
    });
    Array.from(
      document.querySelectorAll(
        "table tr th:nth-child(4), table tr td:nth-child(4)"
      )
    ).forEach((element) => {
      element.style = "display: none";
    });
  }
}

/**
 * Handles column header clicks for sorting.
 * @param {Event} event - Click event from header.
 */
function clickHeader(event) {
  const table = event.currentTarget.closest("table");
  const tableId = table.id;
  const th = event.currentTarget;
  const colIndex = Array.from(th.parentElement.children).indexOf(th);

  if (colIndex !== 1) {
    // Update sorting state
    const state = sortStates[tableId];
    const existingIndex = state.order.findIndex(
      (item) => item.column === colIndex
    );

    if (existingIndex === -1) {
      // New column sorting
      state.order.push({ column: colIndex, direction: "asc" });
      th.classList.toggle("asc");
    } else {
      // Update existing column sorting
      const currentDirection = state.order[existingIndex].direction;
      if (currentDirection === "asc") {
        state.order[existingIndex].direction = "desc";
        th.classList.toggle("asc");
        th.classList.toggle("desc");
      } else {
        // Remove column from sorting
        state.order.splice(existingIndex, 1);
        th.classList.toggle("desc");
        delete th.dataset.position;
      }
    }
  }

  // Update UI and sort table
  updateSortIndicators(table);
  sortTable(table);
}

/**
 * Updates visual indicators for sorted columns.
 * @param {HTMLTableElement} table - Target table to update.
 */
function updateSortIndicators(table) {
  const state = sortStates[table.id];
  const headers = table.querySelectorAll("th");

  headers.forEach((header, index) => {
    const sortIndex = state.order.findIndex((item) => item.column === index);
    if (sortIndex > -1) {
      header.dataset.position = sortIndex + 1;
    } else {
      delete header.dataset.position;
    }
  });
}

/**
 * Sorts table rows based on current sortStates.
 * @param {HTMLTableElement} table - Table to sort.
 */
function sortTable(table) {
  const state = sortStates[table.id];
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headers = table.querySelectorAll("th");

  rows.sort((a, b) => {
    if (Object.entries(state.order).length > 0) {
      for (const sort of state.order) {
        const colIndex = sort.column;
        const direction = sort.direction === "asc" ? 1 : -1;
        const aCell = a.cells[colIndex];
        const bCell = b.cells[colIndex];
        const aValue = parseValue(aCell.textContent, [0, 1].includes(colIndex));
        const bValue = parseValue(bCell.textContent, [0, 1].includes(colIndex));

        if (aValue !== bValue) {
          return aValue > bValue ? direction : -direction;
        }
      }
    } else {
      const aCell = a.cells[0];
      const bCell = b.cells[0];
      const aValue = parseValue(aCell.textContent, true);
      const bValue = parseValue(bCell.textContent, true);

      if (aValue !== bValue) {
        return aValue > bValue ? 1 : -1;
      }
    }
    return 0;
  });

  // Update DOM
  tbody.innerHTML = "";
  rows.forEach((row, idx) => {
    row.classList = idx % 2 === 0 ? "even" : "odd"; // Add alternating row classes
    tbody.appendChild(row);
  });
}

/**
 * Parses cell content for sorting (numeric or string).
 * @param {string} content - Cell text content.
 * @param {boolean} isString - Whether to treat as string.
 * @returns {number|string} - Parsed value for comparison.
 */
function parseValue(content, isString) {
  const numericValue = Number(content.replace(/[^0-9.-]/g, ""));
  if (!isNaN(numericValue) && !isString) {
    return numericValue;
  } else {
    return content.toLowerCase();
  }
}

/**
 * Creates toggleable statistic section
 *
 * @param {string} label - The label for the section (e.g., "Artistes", "Commissions").
 * @param {object} stats - The statistics object containing SFW and NSFW data.
 * @param {string} type - The type of data ("artists" or "commissions").
 * @returns {HTMLElement} - The generated section element.
 */
function createToggleSection(label, stats, type) {
  const total = stats.sfw[type].count + stats.nsfw[type].count;
  if (type === "commissions") totalCommissions = total;
  const percentage = calculatePercentage(stats.sfw[type].count, total);

  const section = document.createElement("div");
  section.innerHTML = `
        <input type="checkbox" id="checkbox-${label}">
        <label class="stat" for="checkbox-${label}">
            ${label}: ${total}
        </label>
        <div class="stat-container">
            <div class="pie-chart" id="ratio-${type.toLowerCase()}" 
                 style="--ratio-var: ${percentage}%"></div>
            <div class="values">
                <div class="sfw">sfw: ${percentage}%</div>
                <div class="nsfw">nsfw: ${100 - percentage}%</div>
            </div>
        </div>
    `;

  return section;
}

/**
 * Creates image ratio subsection
 *
 * @param {object} data - The data object containing statistics for SFW or NSFW.
 * @param {string} type - The type of data ("sfw" or "nsfw").
 * @returns {HTMLElement} - The generated subsection element.
 */
function createImageSubsection(data, type) {
  const images = data.thumbnails.count;
  const others = data.commissions.count - images;
  const percentage = calculatePercentage(images, data.commissions.count);

  const section = document.createElement("div");
  section.innerHTML = `
        <input type="checkbox" id="checkbox-images-${type}">
        <label class="stat" for="checkbox-images-${type}">
            Pictures: ${images} - Others: ${others}
        </label>
        <div class="stat-container">
            <div class="pie-chart" id="ratio-images-${type}" 
                 style="--ratio-var: ${percentage}%"></div>
            <div class="values">
                <div class="sfw">pictures: ${percentage}%</div>
                <div class="nsfw">others: ${calculatePercentage(
                  others,
                  data.commissions.count
                )}%</div>
            </div>
        </div>
    `;

  return section;
}

/**
 * Creates image ratio section for Total panel
 *
 * @param {object} stats - The statistics object containing SFW and NSFW data.
 * @returns {HTMLElement} - The generated section element.
 */
function createImageRatioSection(stats) {
  const totalImages = stats.sfw.thumbnails.count + stats.nsfw.thumbnails.count;
  const totalCommissions =
    stats.sfw.commissions.count + stats.nsfw.commissions.count;
  const others = totalCommissions - totalImages;
  const percentage = calculatePercentage(totalImages, totalCommissions);

  const section = document.createElement("div");
  section.innerHTML = `
        <input type="checkbox" id="checkbox-images-total">
        <label class="stat" for="checkbox-images-total">
            Images: ${totalImages} - Others: ${others}
        </label>
        <div class="stat-container">
            <div class="pie-chart" id="ratio-images" 
                 style="--ratio-var: ${percentage}%"></div>
            <div class="values">
                <div class="sfw">pictures: ${percentage}%</div>
                <div class="nsfw">others: ${
                  Math.round((100 - percentage + Number.EPSILON) * 100) / 100
                }%</div>
            </div>
        </div>
    `;

  return section;
}

/**
 * Utility function to create a container element.
 *
 * @returns {HTMLElement} - A div element with the class "container".
 */
function createContainer() {
  const container = document.createElement("div");
  container.className = "container";
  return container;
}

/**
 * Utility function to create a statistic item.
 *
 * @param {string} label - The label for the statistic (e.g., "Artistes").
 * @param {number} value - The value of the statistic.
 * @returns {HTMLElement} - A div element representing the statistic.
 */
function createStatItem(label, value) {
  const element = document.createElement("div");
  element.className = "stat";
  element.textContent = `${label}: ${value}`;
  return element;
}

/**
 * Calculates the percentage of a numerator relative to a denominator.
 *
 * @param {number} numerator - The numerator value.
 * @param {number} denominator - The denominator value.
 * @returns {number} - The calculated percentage.
 * Returns 0 if the denominator is 0 to avoid division by zero.
 */
function calculatePercentage(numerator, denominator) {
  return denominator === 0
    ? 0
    : Math.round((numerator / denominator) * 10000) / 100; // Return 0 if denominator is 0, otherwise calculate percentage.
}

/**
 * Prevents the default browser context menu from appearing.
 * This disables right-click context menus on the entire document.
 */
function preventContextualMenu() {
  document.addEventListener("contextmenu", function (e) {
    // Prevent the default context menu from showing
    e.preventDefault();
  });
}
