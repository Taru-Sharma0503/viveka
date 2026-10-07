require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generate a deterministic pseudo-random embedding vector for offline testing or fallback.
 * @param {string} text
 * @param {number} dim
 * @returns {number[]}
 */
function generateDeterministicEmbedding(text, dim = 1536) {
  const vector = new Array(dim);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 0.1);
    vector[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  return vector.map((v) => v / norm);
}

/**
 * embedText(text: string): Promise<number[]>
 * Embeds text into a vector using configured LLM provider or fallback.
 */
async function embedText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('embedText requires a non-empty string input');
  }

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

  if (!apiKey || apiKey === 'mock-key' || process.env.NODE_ENV === 'test') {
    return generateDeterministicEmbedding(text, 1536);
  }

  // If using OpenAI provider (key starts with sk-)
  if (apiKey.startsWith('sk-')) {
    try {
      const openai = new OpenAI({ apiKey });
      const response = await openai.embeddings.create({
        model: embeddingModel || 'text-embedding-3-small',
        input: text
      });
      if (response && response.data && response.data[0] && response.data[0].embedding) {
        return response.data[0].embedding;
      }
    } catch (err) {
      console.warn(`[embedText] OpenAI embedding failed: ${err.message}. Falling back...`);
    }
  }

  // Gemini Embedding Provider
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiEmbedModel = (embeddingModel && !embeddingModel.includes('text-embedding')) ? embeddingModel : 'text-embedding-004';
    const model = genAI.getGenerativeModel({ model: geminiEmbedModel });
    const result = await model.embedContent(text);
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
  } catch (err) {
    console.warn(`[embedText] Gemini embedding failed: ${err.message}. Falling back to deterministic vector.`);
  }

  return generateDeterministicEmbedding(text, 1536);
}

module.exports = { embedText, generateDeterministicEmbedding };
