const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const repoRoot = path.resolve(__dirname, '..');

const appScripts = [
  'assets/js/config.js',
  'assets/js/generation.js',
  'assets/js/events.js',
  'assets/js/utilities.js',
];

function createDom(url = 'https://example.com/') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.Element.prototype.scrollIntoView = function () {};
  return { window, dom };
}

function loadApp({ url = 'https://example.com/', artists, artworks, stats } = {}) {
  const { window, dom } = createDom(url);

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

    if (target.includes('new.php')) {
      return {
        ok: true,
        json: async () => [],
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

  const scriptSource = appScripts
    .map((file) => readFileSync(path.join(repoRoot, file), 'utf8'))
    .join('\n');

  window.eval(scriptSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

  return { window, dom };
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
