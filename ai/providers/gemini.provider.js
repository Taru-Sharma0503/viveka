require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini Primary LLM Provider
 */
class GeminiProvider {
  constructor(options = {}) {
    this.name = 'Gemini';
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    this.modelName = options.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    this.timeoutMs = options.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
  }

  /**
   * generate({ systemPrompt, userPrompt, responseSchema })
   */
  async generate({ systemPrompt, userPrompt }) {
    if (!this.apiKey || this.apiKey === 'mock-key') {
      const err = new Error('Gemini API key is missing or invalid');
      err.status = 401;
      err.isFallbackEligible = true;
      throw err;
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.5
      }
    });

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
        err.status = 504;
        err.code = 'ETIMEDOUT';
        err.isFallbackEligible = true;
        reject(err);
      }, this.timeoutMs);
    });

    try {
      const generatePromise = model.generateContent(fullPrompt).then(res => res.response.text());
      const rawText = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        const err = new Error(`Gemini returned malformed JSON: ${parseErr.message}`);
        err.isFallbackEligible = false; // Application/Schema bug, do not trigger provider fallback
        throw err;
      }

      return parsed;
    } catch (err) {
      clearTimeout(timer);
      // Annotate fallback eligibility if not already set
      if (err.isFallbackEligible === undefined) {
        err.isFallbackEligible = this.checkFallbackEligible(err);
      }
      throw err;
    }
  }

  checkFallbackEligible(err) {
    const msg = (err.message || '').toLowerCase();
    const status = err.status || err.statusCode;

    // Do NOT fallback for safety policy blocks or prompt/schema errors
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('malformed json') || status === 400) {
      return false;
    }

    // Fallback for rate limits, quota, timeout, network failure, 5xx
    if (
      status === 429 ||
      status >= 500 ||
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('resource_exhausted') ||
      msg.includes('unavailable') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed')
    ) {
      return true;
    }

    return true; // Default to fallback for provider network errors
  }
}

module.exports = { GeminiProvider };
