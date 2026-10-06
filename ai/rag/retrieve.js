require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { embedText } = require('./embed');

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'vivekananda_passages';

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let cachedPassages = null;

function getLocalPassages() {
  if (cachedPassages) return cachedPassages;
  const embeddedPath = path.join(__dirname, '..', 'data', 'passages.embedded.json');
  const normalPath = path.join(__dirname, '..', 'data', 'passages.json');

  if (fs.existsSync(embeddedPath)) {
    cachedPassages = JSON.parse(fs.readFileSync(embeddedPath, 'utf8'));
  } else if (fs.existsSync(normalPath)) {
    cachedPassages = JSON.parse(fs.readFileSync(normalPath, 'utf8'));
  } else {
    cachedPassages = [];
  }
  return cachedPassages;
}

/**
 * Resolve passage ID to full quote display object (Section 9)
 * @param {string} passageId
 * @returns {Object|null}
 */
function resolvePassageById(passageId) {
  if (!passageId || typeof passageId !== 'string') return null;
  const passages = getLocalPassages();
  const found = passages.find(p => p.id === passageId);
  if (!found) return null;

  return {
    passageId: found.id,
    quote: found.text,
    title: found.source ? found.source.title : '',
    author: found.source ? found.source.author : 'Swami Vivekananda',
    work: found.source ? found.source.work : '',
    section: found.source ? found.source.section : '',
    sourceUrl: found.source ? found.source.sourceUrl : null,
    locationLabel: found.locationLabel || null,
    verified: found.verified ?? true
  };
}

/**
 * retrieveRelevantPassages({ query, topics, topK })
 */
async function retrieveRelevantPassages({ query, topics = [], topK = 3 }) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return [];
  }

  const scoreThreshold = parseFloat(process.env.QDRANT_SCORE_THRESHOLD || '0.45');
  const queryVector = await embedText(query);

  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  if (qdrantUrl && !qdrantUrl.includes('placeholder')) {
    try {
      const client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey || undefined,
        checkCompatibility: false
      });

      const filter = topics && topics.length > 0 ? {
        should: topics.map(t => ({
          key: 'topics',
          match: { value: t }
        }))
      } : undefined;

      const searchResult = await client.search(COLLECTION_NAME, {
        vector: queryVector,
        filter,
        limit: topK,
        score_threshold: scoreThreshold
      });

      if (searchResult && searchResult.length > 0) {
        return searchResult.map(hit => ({
          passageId: hit.payload.passageId,
          score: hit.score,
          text: hit.payload.text,
          topics: hit.payload.topics || [],
          work: hit.payload.work || '',
          section: hit.payload.section || null,
          verified: hit.payload.verified ?? true
        }));
      }
    } catch (err) {
      // Fallback quietly to local in-memory vector search
    }
  }

  // In-Memory Semantic Vector Search Fallback
  const passages = getLocalPassages();
  if (!passages || passages.length === 0) {
    return [];
  }

  const scoredPassages = [];

  for (const p of passages) {
    let passageVec = p.embedding;
    if (!passageVec) {
      passageVec = await embedText(p.text);
      p.embedding = passageVec;
    }

    let sim = cosineSimilarity(queryVector, passageVec);

    if (topics && topics.length > 0 && p.topics) {
      const topicMatch = p.topics.some(t => topics.includes(t.toLowerCase()));
      if (topicMatch) {
        sim += 0.05;
      }
    }

    if (sim >= scoreThreshold) {
      scoredPassages.push({
        passageId: p.id,
        score: sim,
        text: p.text,
        topics: p.topics || [],
        work: p.source ? p.source.work : '',
        section: p.source ? p.source.section : null,
        verified: p.verified ?? true
      });
    }
  }

  scoredPassages.sort((a, b) => b.score - a.score);
  return scoredPassages.slice(0, topK);
}

module.exports = { retrieveRelevantPassages, resolvePassageById, cosineSimilarity };
