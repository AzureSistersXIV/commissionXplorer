# CommissionXplorer Use Cases

This document describes the main use cases that can be inferred from the repository's front-end behavior and dashboard. The application is a commission explorer for browsing artists and their commissions, with content filtering and statistics views.

## Actors

- Visitor: a user browsing the commission catalog.
- Maintainer / Curator: a person managing the published commission dataset and dashboard.

## Use Case List

### 1. Browse the artist catalog

- Primary actor: Visitor
- Goal: View all available artists and quickly scan their displayed artwork thumbnails.
- Preconditions: The application is loaded and the list page is available.
- Main flow:
  1. The visitor opens the site.
  2. The system displays artist cards sorted by artist name and thumbnail preview.
  3. Each card shows a visual placeholder if no preview is available.
- Alternate flow:
  - The visitor can choose to show Safe-for-Work or NSFW categories.

### 2. Filter catalog by content sensitivity

- Primary actor: Visitor
- Goal: Restrict the catalog to either SFW or NSFW content, or a specific NSFW severity level.
- Preconditions: The visitor is on the main catalog page.
- Main flow:
  1. The visitor selects a content filter (SFW / NSFW or a numeric level from 0-4).
  2. The URL updates with the selected filter state.
  3. The system reloads and shows only matching artists.
- Alternate flow:
  - The visitor clears the filter and returns to the default view.

### 3. Search for a specific artist

- Primary actor: Visitor
- Goal: Find an artist quickly without scanning the full catalog.
- Preconditions: The catalog has multiple artists loaded.
- Main flow:
  1. The visitor types a name in the search box.
  2. The system matches artists using the typed prefix.
  3. Matching artists appear in suggestions while the page updates the result count.
  4. The visitor can select a suggestion to jump to that artist.
- Alternate flow:
  - If only one artist matches, the system can auto-select it.

### 4. Open an artist's commission gallery

- Primary actor: Visitor
- Goal: View all commissions associated with a selected artist.
- Preconditions: The visitor has selected an artist card or search result.
- Main flow:
  1. The visitor clicks an artist card.
  2. The app loads that artist's list of commissions.
  3. The system displays preview cards for the available artwork/media files.
- Alternate flow:
  - The selected artist has no thumbnail, so the app shows a placeholder folder icon.

### 5. Review artwork previews and media types

- Primary actor: Visitor
- Goal: Inspect the artwork style or commission file before deciding to open or browse more details.
- Preconditions: The artist gallery is open.
- Main flow:
  1. The visitor sees previews for images, videos, audio, and text files.
  2. The system renders supported media using the correct preview format.
  3. The visitor can identify the file type and artwork style from the preview.
- Alternate flow:
  - Unsupported files are represented with a generic placeholder icon.

### 6. Return to the catalog from a specific artist page

- Primary actor: Visitor
- Goal: Navigate back to the main artist list.
- Preconditions: The visitor is on an artist-specific page.
- Main flow:
  1. The visitor clicks the Return button.
  2. The application restores the previous state and returns the user to the catalog.
  3. The same filters and search context are preserved as part of the browser state.

### 7. Review dashboard statistics

- Primary actor: Maintainer / Curator
- Goal: See overall totals and composition of commissions by artist and content category.
- Preconditions: The dashboard page is loaded and the stats API is reachable.
- Main flow:
  1. The dashboard fetches statistics from the stats endpoint.
  2. The system aggregates totals for SFW and NSFW content.
  3. Panels are rendered for total, SFW, and NSFW results.
- Alternate flow:
  - If the API fails or returns an error, the dashboard shows an error panel instead of normal data.

### 8. Inspect artist-by-artist commission metrics

- Primary actor: Maintainer / Curator
- Goal: Compare individual artists by commission count, picture count, and content share.
- Preconditions: The dashboard is loaded and aggregated stats are available.
- Main flow:
  1. The system generates a table of artists and their stats.
  2. The user can search and sort columns such as artist name, total commissions, picture totals, and percentages.
  3. The data is displayed for both SFW and NSFW categories.
- Alternate flow:
  - The user filters the table using the dedicated search rows in each column.

## Edge Cases and Failure Scenarios

### Edge cases for catalog browsing

- Empty or missing artist thumbnails: the system should display the placeholder icon instead of a broken image.
- Very long artist names or unusual Unicode characters: the UI should still render correctly without breaking layout or search matching.
- Large artist lists: the browser should keep the page responsive while rendering cards and suggestions.
- URL state with unsupported query parameters: the app should fall back to the default safe view instead of crashing.

### Edge cases for content filtering

- `isNsfw` absent, empty, or invalid: the system should default to the safe SFW view or a neutral fallback.
- `isNsfw=0` through `isNsfw=4`: the numeric filter should be clamped and interpreted consistently.
- Switching between SFW and NSFW quickly: the latest selection should win without stale content remaining visible.
- Filter used on an artist page: the filter should not incorrectly affect the single-artist gallery context.

### Edge cases for artist search

- Empty search input: the system should not show misleading or empty suggestion lists.
- Search with mixed case or leading/trailing spaces: matching should still work reliably.
- One matching result: the system should either auto-select it or avoid showing irrelevant suggestions.
- No matching results: the interface should show a clear empty state and keep the user in the catalog.
- Keyboard navigation with arrow keys: focus should move between suggestions without scrolling the page unexpectedly.

### Edge cases for artist gallery opening

- Artist name contains special characters or spacing in the URL: navigation should still resolve the correct record.
- An artist has no commissions: the page should show a meaningful empty gallery rather than a blank or broken state.
- A commission file is missing or unavailable: the preview should degrade gracefully to a placeholder.
- User navigates backward/forward quickly: the correct content should reload based on URL state without duplicate inserts or stale data.

### Edge cases for media previews

- Unsupported file extensions: generic placeholders should appear instead of crashing or showing a broken preview.
- Video, audio, or text files missing metadata: the UI should still render the fallback icon and metadata cleanly.
- Large media files: the preview pipeline should avoid freezing the interface while thumbnails load.
- Mixed media collections: the gallery should handle a combination of image, video, audio, and text artifacts in the same artist folder.

### Edge cases for returning to the catalog

- User opens an artist page directly from a bookmark: the Return action should still go back to a valid catalog page.
- Browser history contains multiple pages or filters: the Return flow should restore the correct prior context, not a stale default state.
- The page is refreshed while on an artist detail view: the app should still recover to a valid root state if no saved artist context exists.

### Failed cases for dashboard statistics

- API returns an error or malformed JSON: the dashboard should display a clear error panel and avoid rendering broken sections.
- Stats endpoint is temporarily unavailable: the page should show a graceful failure state and keep the UI stable.
- Data is partially missing for one category: the dashboard should render the available values and avoid null crashes.
- Unexpected data types in counts or details: the renderer should validate values before creating statistics panels.

### Failed cases for artist metrics table

- Artist names or commissions arrays are incomplete: the table should still render with safe defaults.
- Sorting on columns with missing values: the system should avoid runtime errors and sort deterministically.
- Search rows for certain columns are empty or filled with invalid characters: the filter should ignore invalid input cleanly.
- Large data tables: the UI should remain usable without blocking the browser during rendering or filtering.

## Supporting Requirements Inferred from the Repository

- The system is single-page and uses URL state to determine what is displayed.
- The catalog state is established by query parameters such as `artist` and `isNsfw`.
- Browsing is supported with client-side navigation and history state.
- Search suggestions are interactive and keyboard-accessible.
- Media previews support image, video, audio, and text-based content.
- Dashboard statistics are meant for content overview and monitoring.
- The application should degrade gracefully when filters, data, or network conditions are incomplete or invalid.

## Summary

The repository supports a visitor-focused commission browser and a curator-focused statistics dashboard. The main value is the ability to explore artists, filter content sensitivity, search quickly, and review commission volume and category breakdowns. The edge and failure scenarios above capture the realistic conditions under which the application must remain usable, resilient, and accessible even when data or browser state is imperfect.
