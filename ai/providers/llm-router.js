require('dotenv').config();
const { GeminiProvider } = require('./gemini.provider');
const { GroqProvider } = require('./groq.provider');

/**
 * LLM Router managing Gemini (Primary) and Groq (Fallback) providers
 */
class LLMRouter {
  constructor(options = {}) {
    this.geminiProvider = options.geminiProvider || new GeminiProvider(options.geminiOptions);
    this.groqProvider = options.groqProvider || new GroqProvider(options.groqOptions);
    this.mockFallbackGenerator = options.mockFallbackGenerator || null;
  }

  /**
   * Route LLM generation request
   * @param {Object} params - { systemPrompt, userPrompt, responseSchema }
   * @returns {Promise<Object>} parsed JSON response
   */
  async generate({ systemPrompt, userPrompt, responseSchema }) {
    const isMockMode = process.env.AI_MOCK_MODE === 'true';
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.LLM_API_KEY);
    const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

    // If running in explicit mock mode or without live keys, use mock generator
    if ((isMockMode || (!hasGeminiKey && !hasGroqKey)) && this.mockFallbackGenerator) {
      return this.mockFallbackGenerator({ systemPrompt, userPrompt });
    }

    // Step 1: Attempt Gemini (Primary)
    console.log('[AI] Provider: Gemini');
    try {
      const response = await this.geminiProvider.generate({ systemPrompt, userPrompt, responseSchema });
      console.log('[AI] Generation successful');
      return response;
    } catch (geminiErr) {
      const sanitizedReason = this.sanitizeErrorMessage(geminiErr);
      console.log(`[AI] Gemini failed: ${sanitizedReason}`);

      // Check if fallback to Groq is allowed
      const canFallback = geminiErr.isFallbackEligible !== false;

      if (!canFallback) {
        console.log('[AI] Error is not eligible for fallback. Aborting.');
        throw geminiErr;
      }

      // Step 2: Attempt Groq (Fallback)
      console.log('[AI] Falling back to Groq');
      console.log('[AI] Provider: Groq');

      try {
        const fallbackResponse = await this.groqProvider.generate({ systemPrompt, userPrompt, responseSchema });
        console.log('[AI] Generation successful');
        return fallbackResponse;
      } catch (groqErr) {
        console.log('[AI] Groq fallback failed');
        console.log('[AI] Generation unavailable');

        const controlledError = new Error('AI Generation unavailable: Primary and Fallback providers both failed.');
        controlledError.primaryError = geminiErr;
        controlledError.fallbackError = groqErr;
        controlledError.code = 'LLM_GENERATION_UNAVAILABLE';
        throw controlledError;
      }
    }
  }

  /**
   * Remove sensitive details, API keys, or prompt content from error strings for clean logging
   */
  sanitizeErrorMessage(err) {
    if (!err) return 'Unknown error';
    let msg = err.message || String(err);
    // Sanitize API keys if accidentally present in query params or error message
    msg = msg.replace(/key=[A-Za-z0-9_-]+/gi, 'key=***REDANTED***');
    msg = msg.replace(/gsk_[A-Za-z0-9_-]+/gi, 'gsk_***REDANTED***');
    msg = msg.replace(/sk-[A-Za-z0-9_-]+/gi, 'sk-***REDANTED***');
    if (err.status) {
      return `${err.status} ${msg}`;
    }
    return msg;
  }
}

// Singleton router instance
const defaultRouter = new LLMRouter();

async function generateLLMResponse(params) {
  return defaultRouter.generate(params);
}

module.exports = { LLMRouter, generateLLMResponse, defaultRouter };
