import { useState, useEffect, useCallback } from 'react';

// Hardcoded fallback data - used if fetch fails
export const FALLBACK_MODELS = {
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

const MODELS_URL = '/models.json';
const POLL_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch available models from local JSON endpoint
 * Falls back to hardcoded data if fetch fails or data is invalid
 */
export const fetchAvailableModels = async () => {
  try {
    const response = await fetch(MODELS_URL, {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate scraped data - check for common issues
    if (data.models && data.models.length > 0) {
      const firstModel = data.models[0];
      const providerNames = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'Azure OpenAI'];
      
      // Check if data looks corrupted (provider name in model name field)
      if (providerNames.includes(firstModel.name)) {
        console.warn('Scraped data appears corrupted (provider names in model field), using fallback data');
        return {
          ...FALLBACK_MODELS,
          _warning: 'Using fallback data - scraped data was corrupted'
        };
      }
      
      // Check if most multipliers are null (indicates bad scrape)
      const nullMultiplierCount = data.models.filter(m => m.multiplierPaid === null).length;
      if (nullMultiplierCount > data.models.length * 0.8) {
        console.warn(`Too many null multipliers (${nullMultiplierCount}/${data.models.length}), using fallback data`);
        return {
          ...FALLBACK_MODELS,
          _warning: 'Using fallback data - insufficient multiplier data'
        };
      }
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to fetch models from server, using fallback data:', error.message);
    return FALLBACK_MODELS;
  }
};

/**
 * Custom hook for polling models data
 * @param {number} interval - Polling interval in ms (default: 24 hours)
 * @returns {Object} - { models, loading, error, lastUpdated, refetch }
 */
export const useAvailableModels = (interval = POLL_INTERVAL) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAvailableModels();
      setModels(data.models || []);
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : null);
      // Pass through any warning from fetch validation
      if (data._warning) {
        setError(data._warning);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err.message);
      setModels(FALLBACK_MODELS.models);
      setLastUpdated(new Date(FALLBACK_MODELS.lastUpdated));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchModels();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      console.log('[ModelsService] Polling for model updates...');
      fetchModels();
    }, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchModels, interval]);

  return {
    models,
    loading,
    error,
    lastUpdated,
    refetch: fetchModels
  };
};

/**
 * Get unique providers from models list
 */
export const getProviders = (models) => {
  const providers = new Set(models.map(m => m.provider));
  return Array.from(providers).sort();
};

/**
 * Filter models by provider
 */
export const filterByProvider = (models, provider) => {
  if (!provider || provider === 'All') return models;
  return models.filter(m => m.provider === provider);
};

/**
 * Check if model is available for free plan
 */
export const isFreeAvailable = (model) => {
  return model.multiplierFree !== null;
};

/**
 * Format multiplier for display
 */
export const formatMultiplier = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (value === 0) return '0 (included)';
  return `${value}x`;
};
