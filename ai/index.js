/**
 * Viveka AI Layer Integration Adapter for Node/Express Backend
 *
 * Primary backend entrypoint to invoke the reflective AI mentor module.
 */

const { generateMentorResponse } = require('./ai.service');
const { generateContext } = require('./rag/rag.service');
const { retrieveRelevantPassages, resolvePassageById } = require('./rag/retrieve');
const { embedText } = require('./rag/embed');
const { validateCorpus } = require('./ingestion/validate-corpus');

module.exports = {
  generateMentorResponse,
  generateContext,
  retrieveRelevantPassages,
  resolvePassageById,
  embedText,
  validateCorpus
};
