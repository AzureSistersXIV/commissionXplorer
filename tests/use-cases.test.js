const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const repoRoot = path.resolve(__dirname, '..');

const appScripts = [
  'assets/js/config.js',
  'assets/js/generation.js',
  'assets/js/events.js',
  'assets/js/utilities.js',
];

function createDom(url = 'https://example.com/', { manualAnimationFrames = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const { window } = dom;
  const animationFrames = [];
  if (manualAnimationFrames) {
    window.requestAnimationFrame = (callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    };
  }
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.Element.prototype.scrollIntoView = function () {};
  return { window, dom, animationFrames };
}

function loadApp({
  url = 'https://example.com/',
  artists,
  artworks,
  stats,
  manualAnimationFrames = false,
  fetchImpl,
} = {}) {
  const { window, dom, animationFrames } = createDom(url, { manualAnimationFrames });

  const defaultArtists = {
    Alpha: '../thumbs/alpha.png',
    Beta: '../thumbs/beta.png',
    Gamma: '../thumbs/gamma.png',
  };

  const defaultArtworks = [
    '../commissions/Alpha/one.png',
    '../commissions/Alpha/two.jpg',
    '../commissions/Alpha/audio.mp3',
  ];

  const defaultStats = {
    sfw: {
      artists: { count: 2, details: ['Alpha', 'Beta'] },
      commissions: { count: 5, details: { Alpha: 3, Beta: 2 } },
      thumbnails: { count: 4, details: { Alpha: 2, Beta: 2 } },
    },
    nsfw: {
      artists: { count: 1, details: ['Gamma'] },
      commissions: { count: 2, details: { Gamma: 2 } },
      thumbnails: { count: 2, details: { Gamma: 2 } },
    },
  };

  window.fetch = async (resource) => {
    const target = String(resource);

    if (target.includes('artists.php')) {
      return {
        ok: true,
        json: async () => artists ?? defaultArtists,
      };
    }

    if (target.includes('artworks.php')) {
      return {
        ok: true,
        json: async () => artworks ?? defaultArtworks,
      };
    }

    if (target.includes('thumbnail.php')) {
      return {
        ok: true,
        json: async () => ({}),
      };
    }

    if (target.includes('stats.php')) {
      return {
        ok: true,
        json: async () => stats ?? defaultStats,
      };
    }

    return {
      ok: true,
      json: async () => ({}),
    };
  };
  if (fetchImpl) window.fetch = fetchImpl;

  const scriptSource = appScripts
    .map((file) => readFileSync(path.join(repoRoot, file), 'utf8'))
    .join('\n');

  window.eval(scriptSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  window.document.addEventListener(
    'DOMContentLoaded',
    (event) => event.stopImmediatePropagation(),
    { capture: true, once: true }
  );

  return { window, dom, animationFrames };
}

function loadDashboard({ url = 'https://example.com/dashboard.html', stats } = {}) {
  const { window } = createDom(url);
  const defaultStats = {
    sfw: {
      artists: { count: 2, details: ['Alpha', 'Beta'] },
      commissions: { count: 5, details: { Alpha: 3, Beta: 2 } },
      thumbnails: { count: 4, details: { Alpha: 2, Beta: 2 } },
    },
    nsfw: {
      artists: { count: 1, details: ['Gamma'] },
      commissions: { count: 2, details: { Gamma: 2 } },
      thumbnails: { count: 2, details: { Gamma: 2 } },
    },
  };

  window.fetch = async () => ({
    ok: true,
    json: async () => stats ?? defaultStats,
  });

  const source = readFileSync(path.join(repoRoot, 'assets/js/dashboard.js'), 'utf8');
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  window.document.addEventListener(
    'DOMContentLoaded',
    (event) => event.stopImmediatePropagation(),
    { capture: true, once: true }
  );
  return { window };
}

async function wait(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

test('UC1: the welcome page displays the artist catalog', async () => {
  const { window } = loadApp();
  await wait(50);

  assert.ok(window.document.querySelector('header'));
  assert.equal(window.document.querySelectorAll('.card').length, 3);
  assert.ok(window.document.querySelector('#search'));
  const image = window.document.querySelector('.card img');
  assert.equal(image.loading, 'lazy');
  assert.equal(image.decoding, 'async');
});

test('UC2: content filtering reads and applies NSFW filter state', () => {
  const { window } = loadApp({ url: 'https://example.com/?isNsfw=3' });

  assert.equal(window.parseNsfwParam(), 3);
  assert.ok(window.location.search.includes('isNsfw=3'));
});

test('UC3: search matches artists and shows suggestions', async () => {
  const { window } = loadApp();
  await wait(100);
  const input = window.document.querySelector('#search');

  input.value = 'al';
  window.showSuggestions({ currentTarget: input });

  const suggestions = window.document.querySelectorAll('#suggestions li');
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].textContent.toLowerCase(), 'alpha');
  assert.ok(window.document.querySelector('#results').textContent.includes('1 /'));
});

test('UC4: selecting an artist opens the artist gallery page', () => {
  const { window } = loadApp({ url: 'https://example.com/?isNsfw=true' });
  const card = window.document.createElement('div');
  card.id = 'Beta';

  window.goToArtist({ currentTarget: card });

  assert.equal(window.location.search.includes('artist=Beta'), true);
  assert.equal(window.location.search.includes('isNsfw=true'), true);
});

test('UC5: artwork previews are generated for supported media types', () => {
  const { window } = loadApp();
  const preview = window.generatePreview('../commissions/Alpha/one.png');

  assert.ok(preview);
  assert.equal(preview.className, 'preview');
  assert.ok(preview.querySelector('img'));
  assert.ok(preview.querySelector('img').src.includes('.webp'));
  assert.equal(preview.querySelector('img').loading, 'lazy');
  assert.equal(preview.querySelector('img').decoding, 'async');
});

test('GIF previews use the expected WebP thumbnail path and retain the original link', () => {
  const { window } = loadApp();
  const preview = window.generatePreview('../commissions/Artist/faded.gif');
  const image = preview.querySelector('img');
  const link = preview.querySelector('a');

  assert.equal(
    image.src,
    'https://naslku.synology.me/commissionXplorerAPI/thumbs/Artist/faded.gif.webp'
  );
  assert.equal(link.href, 'https://naslku.synology.me/commissionXplorerAPI/commissions/Artist/faded.gif');
});

test('artwork previews render progressively without changing artwork order', async () => {
  const { window } = loadApp();
  await wait(50);
  const pendingRequests = [];
  window.fetch = () => new Promise((resolve) => pendingRequests.push(resolve));

  const loading = window.setThumbnails(
    'Alpha',
    [
      'commissions/Alpha/one.png',
      'commissions/Alpha/two.png',
      'commissions/Alpha/three.png',
    ],
    new window.AbortController().signal
  );
  await wait();
  assert.equal(pendingRequests.length, 3);

  pendingRequests[1]({ ok: true });
  await wait();
  assert.equal(window.document.querySelectorAll('.preview').length, 0);

  pendingRequests[0]({ ok: true });
  await wait();
  const rendered = window.document.querySelectorAll('.preview img');
  assert.equal(rendered.length, 2);
  assert.ok(rendered[0].src.includes('one.png.webp'));
  assert.ok(rendered[1].src.includes('two.png.webp'));

  pendingRequests[2]({ ok: true });
  await loading;
  assert.equal(window.document.querySelectorAll('.preview').length, 3);
});

test('UC6: return-to-catalog behavior restores the welcome view', () => {
  const { window } = loadApp({ url: 'https://example.com/?artist=Alpha&isNsfw=true' });
  const searchParams = new window.URLSearchParams(window.location.search);
  searchParams.delete('artist');

  window.document.querySelector('#search').value = 'Alpha';
  window.returnIndex();

  assert.equal(window.location.search.includes('artist='), false);
  assert.equal(window.document.querySelector('#search').value, 'Alpha');
});

test('UC7: dashboard panels render overall stats and artist summaries', async () => {
  const { window } = loadDashboard();
  await wait(30);

  assert.ok(window.document.getElementById('Total'));
  assert.ok(window.document.getElementById('SFW'));
  assert.ok(window.document.getElementById('NSFW'));
});

test('UC8: the artist metrics table includes sortable summary columns', async () => {
  const { window } = loadDashboard();
  await wait(30);

  assert.ok(window.document.querySelector('.table'));
  assert.ok(window.document.querySelector('thead'));
});

test('EC1: invalid NSFW values fall back safely', () => {
  const { window } = loadApp({ url: 'https://example.com/?isNsfw=banana' });
  assert.equal(window.parseNsfwParam(), false);
});

test('EC2: missing artwork metadata still generates a preview container', () => {
  const { window } = loadApp();
  const preview = window.generatePreview('../commissions/Alpha/no-such-file.txt');

  assert.ok(preview);
  assert.equal(preview.className, 'preview');
  assert.ok(preview.querySelector('img'));
});

test('FC1: dashboard errors are rendered when the stats API returns an error object', async () => {
  const { window } = loadDashboard({ stats: { error: 'Stats unavailable' } });
  await wait(50);

  const errorNode = window.document.getElementById('Error');
  assert.ok(errorNode);
  assert.match(errorNode.textContent, /Stats unavailable/);
});

test('[PERFORMANCE] catalog rendering yields between card batches', async () => {
  const artists = Object.fromEntries(
    Array.from({ length: 45 }, (_, index) => [`Artist ${index}`, '../thumbs/artist.png'])
  );
  const { window, animationFrames } = loadApp({
    artists,
    manualAnimationFrames: true,
  });

  await wait(5);
  assert.equal(window.document.querySelectorAll('.card').length, 20);
  assert.equal(animationFrames.length, 1);

  animationFrames.shift()(0);
  await wait(0);
  assert.equal(window.document.querySelectorAll('.card').length, 40);
  assert.equal(animationFrames.length, 1);

  animationFrames.shift()(16);
  await wait(0);
  assert.equal(window.document.querySelectorAll('.card').length, 45);
});

test('[SIT] artist and thumbnail API requests use the expected payloads', async () => {
  const requests = [];
  const { window } = loadApp({
    url: 'https://example.com/?artist=Alpha',
    fetchImpl: async (resource, options = {}) => {
      requests.push({ url: String(resource), ...options });
      if (String(resource).includes('artworks.php')) {
        return {
          ok: true,
          json: async () => ['../commissions/Alpha/one.png', '../commissions/Alpha/two.jpg'],
        };
      }
      return { ok: true };
    },
  });
  await wait(350);

  const artworkRequest = requests.find(({ url }) => url.includes('artworks.php'));
  assert.equal(artworkRequest.method, 'POST');
  assert.match(artworkRequest.headers['Content-Type'], /x-www-form-urlencoded/);
  assert.equal(String(artworkRequest.body), 'artist=Alpha');

  const thumbnailRequests = requests.filter(({ url }) => url.includes('thumbnail.php'));
  assert.equal(thumbnailRequests.length, 2);
  assert.deepEqual(
    thumbnailRequests.map(({ body }) => JSON.parse(body).artworks[0]),
    ['commissions/Alpha/one.png', 'commissions/Alpha/two.jpg']
  );
});

test('[UAT] searching and choosing a suggestion selects the matching artist', async () => {
  const { window } = loadApp();
  await wait(50);

  const search = window.document.querySelector('#search');
  search.value = 'al';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));

  const suggestion = window.document.querySelector('#suggestions li');
  assert.equal(suggestion.textContent, 'Alpha');
  suggestion.click();

  assert.equal(search.value, '');
  assert.ok(window.document.getElementById('Alpha').classList.contains('searched'));
  assert.equal(window.document.getElementById('Beta').dataset.hidden, 'true');
});

test('[QA] dashboard sorting and filtering preserve correct row results', async () => {
  const { window } = loadDashboard();
  await wait(50);

  const table = window.document.querySelector('#artists');
  table.querySelectorAll('thead tr:first-child th')[4].click();
  const commissionCounts = Array.from(table.querySelectorAll('tbody tr'), (row) =>
    Number(row.cells[4].textContent)
  );
  assert.deepEqual(commissionCounts, [2, 2, 3]);

  const artistSearch = table.querySelector('thead tr:last-child input');
  artistSearch.value = 'gamma';
  artistSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.deepEqual(
    Array.from(table.querySelectorAll('tbody tr:not([hidden]) td:first-child'), (cell) =>
      cell.textContent
    ),
    ['Gamma']
  );
});

test('[SECURITY] API-provided dashboard text cannot inject markup', async () => {
  const maliciousName = '<img src=x onerror=alert(1)>';
  const stats = {
    sfw: {
      artists: { count: maliciousName, details: [maliciousName] },
      commissions: { count: maliciousName, details: { [maliciousName]: 1 } },
      thumbnails: { count: maliciousName, details: { [maliciousName]: 1 } },
    },
    nsfw: {
      artists: { count: 0, details: [] },
      commissions: { count: 0, details: {} },
      thumbnails: { count: 0, details: {} },
    },
  };
  const { window } = loadDashboard({ stats });
  await wait(50);

  const artistCell = window.document.querySelector('#artists tbody td:first-child');
  assert.equal(artistCell.textContent, maliciousName);
  assert.equal(window.document.querySelector('img'), null);

  const errorPayload = '<img src=x onerror=alert(1)>';
  const errorDashboard = loadDashboard({ stats: { error: errorPayload } });
  await wait(30);
  const errorNode = errorDashboard.window.document.getElementById('Error');
  assert.equal(errorNode.textContent, errorPayload);
  assert.equal(errorNode.querySelector('img'), null);
});

test('[CHAOS] an aborted catalog request clears loading state without rendering stale data', async () => {
  const { window } = loadApp();
  await wait(50);
  window.document.querySelector('#gallery').replaceChildren();

  window.fetch = (_resource, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => reject(new window.DOMException('Request aborted', 'AbortError')),
        { once: true }
      );
    });

  const controller = new window.AbortController();
  const loading = window.loadArtists(controller.signal);
  await wait(0);
  controller.abort();
  await loading;

  assert.equal(window.document.querySelectorAll('.card').length, 0);
  assert.equal(window.document.querySelector('#spinner').classList.contains('loading'), false);
});

test('[ALPHA] an artist URL loads artwork previews end to end', async () => {
  const { window } = loadApp({ url: 'https://example.com/?artist=Alpha' });
  await wait(350);

  assert.equal(window.document.querySelectorAll('.preview').length, 3);
  assert.ok(window.document.querySelector('.preview img').src.includes('.webp'));
  assert.ok(window.document.querySelector('.preview audio'));
});

test('[BETA SMOKE] published pages reference assets present in the deployment tree', () => {
  for (const page of ['index.html', 'dashboard.html']) {
    const html = readFileSync(path.join(repoRoot, page), 'utf8');
    const references = Array.from(
      html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g),
      (match) => match[1]
    );

    assert.ok(references.length > 0, `${page} should reference local assets`);
    for (const asset of references) {
      assert.ok(
        existsSync(path.join(repoRoot, asset)),
        `${page} references missing asset ${asset}`
      );
    }
  }
});
