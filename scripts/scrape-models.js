const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DOCS_URL = 'https://docs.github.com/en/copilot/using-github-copilot/ai-models/supported-ai-models-in-copilot';
const OUTPUT_PATH = process.env.MODELS_OUTPUT_PATH || '/usr/share/nginx/html/models.json';
const FALLBACK_PATH = path.join(__dirname, '..', 'src', 'data', 'fallback-models.json');

// Hardcoded fallback data - update this manually when models change
const FALLBACK_MODELS = {
  "lastUpdated": "2026-02-15T00:00:00Z",
  "source": "fallback",
  "models": [
    {
      "name": "GPT-4.1",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 0,
      "multiplierFree": 1
    },
    {
      "name": "GPT-5",
      "provider": "OpenAI",
      "status": "Closing down: 2026-02-17",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5 mini",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 0,
      "multiplierFree": 1
    },
    {
      "name": "GPT-5-Codex",
      "provider": "OpenAI",
      "status": "Closing down: 2026-02-17",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.1",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.1-Codex",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.1-Codex-Mini",
      "provider": "OpenAI",
      "status": "Public preview",
      "multiplierPaid": 0.33,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.1-Codex-Max",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.2",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.2-Codex",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "GPT-5.3-Codex",
      "provider": "OpenAI",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "Claude Haiku 4.5",
      "provider": "Anthropic",
      "status": "GA",
      "multiplierPaid": 0.33,
      "multiplierFree": 1
    },
    {
      "name": "Claude Opus 4.1",
      "provider": "Anthropic",
      "status": "Closing down: 2026-02-17",
      "multiplierPaid": 10,
      "multiplierFree": null
    },
    {
      "name": "Claude Opus 4.5",
      "provider": "Anthropic",
      "status": "GA",
      "multiplierPaid": 3,
      "multiplierFree": null
    },
    {
      "name": "Claude Opus 4.6",
      "provider": "Anthropic",
      "status": "GA",
      "multiplierPaid": 3,
      "multiplierFree": null
    },
    {
      "name": "Claude Opus 4.6 (fast mode) (preview)",
      "provider": "Anthropic",
      "status": "Public preview",
      "multiplierPaid": 9,
      "multiplierFree": null
    },
    {
      "name": "Claude Sonnet 4",
      "provider": "Anthropic",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "Claude Sonnet 4.5",
      "provider": "Anthropic",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "Gemini 2.5 Pro",
      "provider": "Google",
      "status": "GA",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "Gemini 3 Flash",
      "provider": "Google",
      "status": "Public preview",
      "multiplierPaid": 0.33,
      "multiplierFree": null
    },
    {
      "name": "Gemini 3 Pro",
      "provider": "Google",
      "status": "Public preview",
      "multiplierPaid": 1,
      "multiplierFree": null
    },
    {
      "name": "Grok Code Fast 1",
      "provider": "xAI",
      "status": "GA",
      "multiplierPaid": 0.25,
      "multiplierFree": null
    },
    {
      "name": "Raptor mini",
      "provider": "Fine-tuned GPT-5 mini",
      "status": "Public preview",
      "multiplierPaid": 0,
      "multiplierFree": 1
    }
  ]
};

/**
 * Parse model status from text
 */
function parseStatus(statusText) {
  if (!statusText || statusText.trim() === '') return 'GA';
  return statusText.trim();
}

/**
 * Parse multiplier value
 */
function parseMultiplier(value) {
  if (!value || value.toLowerCase().includes('not applicable')) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Scrape models from GitHub Docs
 */
async function scrapeModels() {
  console.log(`[${new Date().toISOString()}] Scraping models from GitHub Docs...`);
  
  try {
    const response = await axios.get(DOCS_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'GitHub-Copilot-Models-Scraper/1.0'
      }
    });

    const $ = cheerio.load(response.data);
    const models = [];

    // Find the models table - it's typically the first table after "Supported AI models in Copilot" heading
    // The table has columns: Model name, Provider, Release status, Agent mode, Ask mode, Edit mode
    // We'll extract model name, provider, and status
    
    $('table').each((tableIndex, table) => {
      const headers = [];
      $(table).find('thead tr th').each((i, th) => {
        headers.push($(th).text().trim().toLowerCase());
      });

      // Check if this is the models table
      if (headers.includes('model name') && headers.includes('provider')) {
        const modelNameIndex = headers.indexOf('model name');
        const providerIndex = headers.indexOf('provider');
        const statusIndex = headers.indexOf('release status');

        $(table).find('tbody tr').each((i, row) => {
          // Get all cells including th (first column is <th scope="row">)
          const cells = $(row).find('td, th');
          if (cells.length >= 2) {
            const modelName = $(cells[modelNameIndex]).text().trim();
            const provider = $(cells[providerIndex]).text().trim();
            const status = statusIndex >= 0 ? $(cells[statusIndex]).text().trim() : 'GA';

            // Validate: model name shouldn't be a provider name, and provider shouldn't be a status
            const providerNames = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'Azure OpenAI'];
            const statusValues = ['GA', 'Public preview', 'Closing down'];
            
            // Skip if data looks wrong (provider in name field, etc.)
            if (providerNames.includes(modelName) || statusValues.some(s => provider.includes(s))) {
              console.warn(`Skipping invalid row: name="${modelName}", provider="${provider}"`);
              return;
            }

            if (modelName && provider && modelName !== provider) {
              // Try to find multiplier info in the page text near this model
              // For now, we'll use the fallback multipliers
              const fallbackModel = FALLBACK_MODELS.models.find(m => m.name === modelName);
              
              models.push({
                name: modelName,
                provider: provider,
                status: parseStatus(status),
                multiplierPaid: fallbackModel?.multiplierPaid ?? null,
                multiplierFree: fallbackModel?.multiplierFree ?? null
              });
            }
          }
        });
      }
    });

    if (models.length === 0) {
      console.warn('No models found in HTML, using fallback data');
      return FALLBACK_MODELS;
    }

    // Validate scraped data quality
    const validModels = models.filter(m => {
      // Check if model name looks valid (shouldn't be just a provider name)
      const providerNames = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'Azure OpenAI'];
      if (providerNames.includes(m.name)) {
        console.warn(`Invalid model name detected: "${m.name}" - skipping`);
        return false;
      }
      // Must have name and provider
      return m.name && m.provider && m.name.length > 0 && m.provider.length > 0;
    });

    if (validModels.length === 0) {
      console.warn('No valid models after filtering, using fallback data');
      return FALLBACK_MODELS;
    }

    if (validModels.length < models.length) {
      console.warn(`Filtered out ${models.length - validModels.length} invalid model entries`);
    }

    console.log(`Successfully scraped ${validModels.length} valid models`);
    
    return {
      lastUpdated: new Date().toISOString(),
      source: 'scraped',
      url: DOCS_URL,
      models: validModels
    };

  } catch (error) {
    console.error('Error scraping models:', error.message);
    return FALLBACK_MODELS;
  }
}

/**
 * Save models data to file
 */
async function saveModels(data) {
  try {
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log(`[${new Date().toISOString()}] Models saved to ${OUTPUT_PATH}`);
    
    // Also save as fallback for next time
    const fallbackDir = path.dirname(FALLBACK_PATH);
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_PATH, JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error saving models:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== GitHub Copilot Models Scraper ===');
  console.log(`Target URL: ${DOCS_URL}`);
  console.log(`Output path: ${OUTPUT_PATH}`);
  console.log('');

  const models = await scrapeModels();
  await saveModels(models);
  
  console.log('\nDone!');
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapeModels, FALLBACK_MODELS };
