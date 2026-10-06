const fs = require('fs');
const path = require('path');
const { validateCorpus } = require('../ingestion/validate-corpus');
const { retrieveRelevantPassages, resolvePassageById } = require('../rag/retrieve');
const { generateContext } = require('../rag/rag.service');
const { generateMentorResponse } = require('../ai.service');

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runCorpusAndRagVerificationTests() {
  console.log('\n--- CORPUS INTEGRITY & REAL RAG VERIFICATION TEST SUITE ---');

  const corpusPath = path.join(__dirname, '..', 'data', 'passages.json');
  const passages = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  // Test 1: Every production passage has a unique ID
  console.log('Corpus Test 1: Unique passage IDs');
  const ids = passages.map(p => p.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, `Every passage must have a unique ID (${ids.length} passages, ${uniqueIds.size} unique IDs)`);

  // Test 2: Non-empty exact text
  console.log('Corpus Test 2: Non-empty exact text');
  const allHasText = passages.every(p => typeof p.text === 'string' && p.text.trim().length > 0);
  assert(allHasText, 'Every production passage must have non-empty exact text');

  // Test 3: Source metadata exists
  console.log('Corpus Test 3: Complete source metadata');
  const allHasSource = passages.every(p => p.source && p.source.title && p.source.author && p.source.work);
  assert(allHasSource, 'Every production passage must have source title, author, and work');

  // Test 4: At least one topic tag
  console.log('Corpus Test 4: Non-empty topic arrays');
  const allHasTopics = passages.every(p => Array.isArray(p.topics) && p.topics.length > 0);
  assert(allHasTopics, 'Every production passage must have at least one topic tag');

  // Test 5: verified === true for all production passages
  console.log('Corpus Test 5: Verified status');
  const allVerified = passages.every(p => p.verified === true);
  assert(allVerified, 'Every production passage must have verified: true');

  // Test 6: No duplicate exact text
  console.log('Corpus Test 6: No duplicate text');
  const texts = passages.map(p => p.text.trim().toLowerCase());
  const uniqueTexts = new Set(texts);
  assert(texts.length === uniqueTexts.size, 'No duplicate exact text allowed across corpus');

  // Test 7: Passage ID resolution to quote object
  console.log('Corpus Test 7: passageId resolution via resolvePassageById');
  const resolved = resolvePassageById('VIV_001');
  assert(resolved !== null && resolved.quote.includes('strength'), 'resolvePassageById must resolve passage ID to exact verified quotation');
  assert(resolved.verified === true, 'Resolved passage object must retain verified: true');

  // Test 8: RAG Query Scenario - Fear / Courage
  console.log('RAG Scenario 1: Fear query ("I am scared to take this opportunity.")');
  const fearContext = await generateContext({
    userMessage: 'I am scared to take this opportunity.',
    theme: 'FEAR'
  });
  assert(fearContext.passages.length > 0, 'RAG must retrieve passages for fear query');
  assert(fearContext.passages[0].passageId.startsWith('VIV_'), 'Retrieved passage ID must start with VIV_');

  // Test 9: RAG Query Scenario - Failure
  console.log('RAG Scenario 2: Failure query ("I failed an exam and now I think I\'m useless.")');
  const failureContext = await generateContext({
    userMessage: 'I failed an exam and now I think I am useless.',
    theme: 'FAILURE'
  });
  assert(failureContext.passages.length > 0, 'RAG must retrieve passages for failure query');

  // Test 10: RAG Query Scenario - Self-doubt
  console.log('RAG Scenario 3: Self-doubt query ("I don\'t think I am capable enough.")');
  const doubtContext = await generateContext({
    userMessage: 'I do not think I am capable enough.',
    theme: 'SELF_DOUBT'
  });
  assert(doubtContext.passages.length > 0, 'RAG must retrieve passages for self-doubt query');

  // Test 11: RAG Query Scenario - Concentration
  console.log('RAG Scenario 4: Concentration query ("I cannot focus on anything.")');
  const focusContext = await generateContext({
    userMessage: 'I cannot focus on anything.',
    theme: 'CONCENTRATION'
  });
  assert(focusContext.passages.length > 0, 'RAG must retrieve passages for concentration query');

  // Test 12: RAG Query Scenario - Unrelated query (No forced quotation)
  console.log('RAG Scenario 5: Unrelated query ("What is the weather tomorrow?")');
  const unrelatedResp = await generateMentorResponse({
    stage: 'TEACHING',
    userMessage: 'What is the weather tomorrow?',
    retrievedPassages: []
  });
  assert(unrelatedResp.mode === 'NO_SOURCE', 'Unrelated query must return NO_SOURCE mode without forcing quotation');

  console.log('--- ALL CORPUS & RAG VERIFICATION TESTS PASSED ---\n');
}

module.exports = { runCorpusAndRagVerificationTests };
