/**
 * scrape-models.js — GitHub Copilot available-models scraper
 *
 * Intentionally uses ONLY Node built-in modules (https, fs, path) so it runs
 * on Node 18-alpine inside the Docker container without any npm dependencies.
 * cheerio and axios both transitively load undici ≥ 7, which requires the
 * global File API that was only added in Node 20.
 *
 * HTML parsing uses a lightweight regex-based table extractor that is robust
 * enough for the well-structured GitHub Docs HTML.
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DOCS_URL    = 'https://docs.github.com/en/copilot/using-github-copilot/ai-models/supported-ai-models-in-copilot';
const OUTPUT_PATH = process.env.MODELS_OUTPUT_PATH || '/usr/share/nginx/html/models.json';
const FALLBACK_PATH = path.join(__dirname, '..', 'src', 'data', 'fallback-models.json');

// ---------------------------------------------------------------------------
// Fallback data — updated 2026-04-03 from live scrape.
// Used when the network fetch fails or returns no parseable models.
// ---------------------------------------------------------------------------
const FALLBACK_MODELS = {
  "lastUpdated": "2026-04-03T00:00:00Z",
  "source": "fallback",
  "models": [
    { "name": "GPT-4.1",                          "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": 0,    "multiplierFree": 1    },
    { "name": "GPT-5 mini",                        "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": 0,    "multiplierFree": 1    },
    { "name": "GPT-5.1",                           "provider": "OpenAI",                    "status": "Closing down: 2026-04-15",    "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "GPT-5.2",                           "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "GPT-5.2-Codex",                     "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "GPT-5.3-Codex",                     "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "GPT-5.4",                           "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": null, "multiplierFree": null },
    { "name": "GPT-5.4 mini",                      "provider": "OpenAI",                    "status": "GA",                          "multiplierPaid": null, "multiplierFree": null },
    { "name": "Claude Haiku 4.5",                  "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": 0.33, "multiplierFree": 1    },
    { "name": "Claude Opus 4.5",                   "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": 3,    "multiplierFree": null },
    { "name": "Claude Opus 4.6",                   "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": 3,    "multiplierFree": null },
    { "name": "Claude Opus 4.6 (fast mode) (preview)", "provider": "Anthropic",             "status": "Public preview",              "multiplierPaid": 9,    "multiplierFree": null },
    { "name": "Claude Sonnet 4",                   "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "Claude Sonnet 4.5",                 "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "Claude Sonnet 4.6",                 "provider": "Anthropic",                 "status": "GA",                          "multiplierPaid": null, "multiplierFree": null },
    { "name": "Gemini 2.5 Pro",                    "provider": "Google",                    "status": "GA",                          "multiplierPaid": 1,    "multiplierFree": null },
    { "name": "Gemini 3 Flash",                    "provider": "Google",                    "status": "Public preview",              "multiplierPaid": 0.33, "multiplierFree": null },
    { "name": "Gemini 3.1 Pro",                    "provider": "Google",                    "status": "Public preview",              "multiplierPaid": null, "multiplierFree": null },
    { "name": "Grok Code Fast 1",                  "provider": "xAI",                       "status": "GA",                          "multiplierPaid": 0.25, "multiplierFree": null },
    { "name": "Raptor mini",                       "provider": "Fine-tuned GPT-5 mini",     "status": "Public preview",              "multiplierPaid": 0,    "multiplierFree": 1    },
    { "name": "Goldeneye",                         "provider": "Fine-tuned GPT-5.1-Codex",  "status": "Public preview",              "multiplierPaid": null, "multiplierFree": null }
  ]
};

// ---------------------------------------------------------------------------
// HTTP helper — built-in https only, follows redirects, no external deps
// ---------------------------------------------------------------------------
function httpsGet(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 5;
  return new Promise(function(resolve, reject) {
    // Node 18 https.get requires a URL object (not a plain string) for full URL requests
    var parsedUrl;
    try { parsedUrl = new URL(url); } catch (e) { return reject(new Error('Invalid URL: ' + url)); }
    var options = {
      headers: { 'User-Agent': 'GitHub-Copilot-Models-Scraper/1.0' },
      timeout: 30000
    };
    var req = https.get(parsedUrl, options, function(res) {
      // Follow redirects (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects === 0) {
          res.resume();
          return reject(new Error('Too many redirects'));
        }
        res.resume();
        // Resolve relative redirect URLs against the current URL
        var location = res.headers.location;
        try {
          location = new URL(location, parsedUrl).toString();
        } catch (e) { /* already absolute */ }
        return resolve(httpsGet(location, maxRedirects - 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end',  function()  { resolve(Buffer.concat(chunks).toString('utf8')); });
      res.on('error', reject);
    });
    req.on('timeout', function() { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Lightweight HTML table extractor — no external parser needed
// ---------------------------------------------------------------------------

/** Strip all HTML tags from a string and decode common entities. */
function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract all <table>...</table> blocks from an HTML string.
 * Returns an array of raw HTML strings, one per table.
 */
function extractTables(html) {
  var tables = [];
  var re = /<table[\s>]/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var start = match.index;
    // Find the matching </table> — handle nesting (rare but safe)
    var depth = 1;
    var i = start + match[0].length;
    while (i < html.length && depth > 0) {
      if (html.slice(i, i + 7).toLowerCase() === '</table') {
        depth--;
        i += 7;
      } else if (html.slice(i, i + 6).toLowerCase() === '<table') {
        depth++;
        i += 6;
      } else {
        i++;
      }
    }
    tables.push(html.slice(start, i));
  }
  return tables;
}

/**
 * Extract cell text from a <tr> row.
 * Handles both <th> and <td> cells.
 */
function extractCells(rowHtml) {
  var cells = [];
  var re = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  var match;
  while ((match = re.exec(rowHtml)) !== null) {
    cells.push(stripTags(match[1]));
  }
  return cells;
}

/**
 * Extract all rows from a table's <thead> or <tbody>.
 * Returns array of cell-text arrays.
 */
function extractRows(tableHtml) {
  var rows = [];
  var re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var match;
  while ((match = re.exec(tableHtml)) !== null) {
    var cells = extractCells(match[1]);
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Model scraper
// ---------------------------------------------------------------------------

function parseMultiplier(value) {
  if (!value || value.toLowerCase().includes('not applicable')) return null;
  var num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function scrapeModels() {
  console.log('[' + new Date().toISOString() + '] Scraping models from GitHub Docs...');

  try {
    var html = await httpsGet(DOCS_URL);
    var tables = extractTables(html);
    var models = [];

    var providerNames = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'Azure OpenAI', 'Microsoft'];
    var statusValues  = ['GA', 'Public preview', 'Closing down', 'Beta'];

    for (var t = 0; t < tables.length; t++) {
      var rows = extractRows(tables[t]);
      if (rows.length < 2) continue;

      // Identify header row
      var headers = rows[0].map(function(h) { return h.toLowerCase(); });
      var modelNameIdx = headers.indexOf('model name');
      var providerIdx  = headers.indexOf('provider');
      var statusIdx    = headers.indexOf('release status');

      if (modelNameIdx === -1 || providerIdx === -1) continue;

      // Data rows
      for (var r = 1; r < rows.length; r++) {
        var cells = rows[r];
        if (cells.length <= Math.max(modelNameIdx, providerIdx)) continue;

        var modelName = cells[modelNameIdx];
        var provider  = cells[providerIdx];
        var status    = statusIdx >= 0 && cells[statusIdx] ? cells[statusIdx] : 'GA';

        // Skip rows where columns appear transposed or contain header-like content
        if (!modelName || !provider) continue;
        if (providerNames.includes(modelName)) {
          console.warn('Skipping row — model name looks like a provider: "' + modelName + '"');
          continue;
        }
        if (statusValues.some(function(s) { return provider.includes(s); })) {
          console.warn('Skipping row — provider cell contains status value: "' + provider + '"');
          continue;
        }
        if (modelName === provider) continue;

        // Carry over known multipliers from fallback; new models will have null
        var fallback = FALLBACK_MODELS.models.find(function(m) { return m.name === modelName; });

        models.push({
          name:           modelName,
          provider:       provider,
          status:         status.trim() || 'GA',
          multiplierPaid:  fallback ? fallback.multiplierPaid  : null,
          multiplierFree:  fallback ? fallback.multiplierFree  : null
        });
      }
    }

    if (models.length === 0) {
      console.warn('No models found in HTML — using fallback data');
      return FALLBACK_MODELS;
    }

    console.log('Successfully scraped ' + models.length + ' models');
    return {
      lastUpdated: new Date().toISOString(),
      source:      'scraped',
      url:         DOCS_URL,
      models:      models
    };

  } catch (err) {
    console.error('Error scraping models:', err.message);
    return FALLBACK_MODELS;
  }
}

// ---------------------------------------------------------------------------
// File writer
// ---------------------------------------------------------------------------

async function saveModels(data) {
  try {
    var outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log('[' + new Date().toISOString() + '] Models saved to ' + OUTPUT_PATH);

    // Mirror to src/data/fallback-models.json so the React build picks it up
    var fallbackDir = path.dirname(FALLBACK_PATH);
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_PATH, JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error saving models:', err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== GitHub Copilot Models Scraper ===');
  console.log('Target URL: ' + DOCS_URL);
  console.log('Output path: ' + OUTPUT_PATH);
  console.log('');

  var data = await scrapeModels();
  await saveModels(data);
  console.log('\nDone!');
}

if (require.main === module) {
  main().catch(function(err) {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapeModels, FALLBACK_MODELS };
