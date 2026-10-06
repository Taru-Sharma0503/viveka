require('dotenv').config();
const Groq = require('groq-sdk');

/**
 * Groq Fallback LLM Provider
 */
class GroqProvider {
  constructor(options = {}) {
    this.name = 'Groq';
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    this.modelName = options.model || process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    this.timeoutMs = options.timeoutMs || parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
  }

  /**
   * generate({ systemPrompt, userPrompt, responseSchema })
   */
  async generate({ systemPrompt, userPrompt }) {
    if (!this.apiKey || this.apiKey === 'mock-key') {
      const err = new Error('Groq API key is missing or invalid');
      err.status = 401;
      err.isFallbackEligible = false;
      throw err;
    }

    const groq = new Groq({ apiKey: this.apiKey });

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`Groq request timed out after ${this.timeoutMs}ms`);
        err.status = 504;
        err.code = 'ETIMEDOUT';
        reject(err);
      }, this.timeoutMs);
    });

    try {
      const generatePromise = groq.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5
      }).then(res => res.choices[0]?.message?.content);

      const rawText = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      if (!rawText) {
        throw new Error('Groq returned empty response body');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        const err = new Error(`Groq returned malformed JSON: ${parseErr.message}`);
        err.isFallbackEligible = false;
        throw err;
      }

      return parsed;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}

module.exports = { GroqProvider };
