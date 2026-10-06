const path = require('path');
const fs = require('fs');
const { validateCorpus } = require('../ingestion/validate-corpus');
const { embedText } = require('../rag/embed');
const { retrieveRelevantPassages } = require('../rag/retrieve');
const { generateContext } = require('../rag/rag.service');
const { generateMentorResponse, validateResponse } = require('../ai.service');
const { runRouterTests } = require('./provider-router.test');
const { runCorpusAndRagVerificationTests } = require('./corpus-rag-verification.test');
const { runEndToEndJourneyTests } = require('./e2e-journey.test');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('==================================================');
  console.log('       VIVEKA AI LAYER TEST SUITE RUNNER          ');
  console.log('==================================================\n');

  // Set mock mode for deterministic test execution
  process.env.AI_MOCK_MODE = 'true';

  // 1. End-to-End Reflection Journey Test
  try {
    await runEndToEndJourneyTests();
    passedTests += 7; // 7 stages assertions
  } catch (err) {
    console.error('End-to-End Journey Test Error:', err.message);
    failedTests++;
  }

  // 2. Provider Router Unit Tests
  try {
    await runRouterTests();
    passedTests += 8;
  } catch (err) {
    console.error('Provider Router Test Error:', err.message);
    failedTests++;
  }

  // 3. Corpus & RAG Verification Unit Tests
  try {
    await runCorpusAndRagVerificationTests();
    passedTests += 12;
  } catch (err) {
    console.error('Corpus/RAG Verification Test Error:', err.message);
    failedTests++;
  }

  // 4. Standard AI Scenario Tests
  console.log('Test 1: Valid corpus validation');
  const validRes = validateCorpus();
  assert(validRes.valid === true, 'Corpus passages.json should pass validation');
  assert(validRes.total >= 15, `Corpus should contain at least 15 passages (found ${validRes.total})`);

  console.log('\nTest 2: Invalid corpus detection');
  const tempInvalidPath = path.join(__dirname, 'temp_invalid.json');
  fs.writeFileSync(tempInvalidPath, JSON.stringify([{ id: 'INVALID', text: '' }]), 'utf8');
  const invalidRes = validateCorpus(tempInvalidPath);
  fs.unlinkSync(tempInvalidPath);
  assert(invalidRes.valid === false, 'Corpus validator must reject invalid passage data');

  console.log('\nTest 3: Duplicate passage ID detection');
  const tempDupPath = path.join(__dirname, 'temp_dup.json');
  const dupData = [
    { id: 'VIV_001', text: 'Text A', source: { title: 'T', author: 'A', work: 'W' }, topics: ['fear'], verified: true, language: 'en' },
    { id: 'VIV_001', text: 'Text B', source: { title: 'T', author: 'A', work: 'W' }, topics: ['fear'], verified: true, language: 'en' }
  ];
  fs.writeFileSync(tempDupPath, JSON.stringify(dupData), 'utf8');
  const dupRes = validateCorpus(tempDupPath);
  fs.unlinkSync(tempDupPath);
  assert(dupRes.valid === false && dupRes.duplicateIds > 0, 'Corpus validator must catch duplicate passage IDs');

  console.log('\nTest 4: Embedding generation');
  const sampleVector = await embedText('Face the terrible, face it boldly.');
  assert(Array.isArray(sampleVector) && sampleVector.length > 0, `embedText must return array vector (length: ${sampleVector.length})`);

  console.log('\nTest 5: Passage Retrieval for fear/interview query');
  const passages = await retrieveRelevantPassages({
    query: 'I am scared that I will fail my interview and panic.',
    topics: ['fear', 'courage'],
    topK: 3
  });
  assert(Array.isArray(passages) && passages.length > 0, 'Retrieval should find relevant passages for fear query');
  if (passages.length > 0) {
    assert(passages[0].passageId.startsWith('VIV_'), `Retrieved passage ID should start with VIV_ (got ${passages[0].passageId})`);
  }

  console.log('\nTest 6: No-source retrieval for empty teaching retrieval');
  const noSourceResp = await generateMentorResponse({
    stage: 'TEACHING',
    userMessage: 'Something completely unrelated to Vivekananda teachings',
    retrievedPassages: []
  });
  assert(noSourceResp.mode === 'NO_SOURCE', 'System must return NO_SOURCE mode when no relevant passages are retrieved');
  assert(noSourceResp.passageIds.length === 0, 'NO_SOURCE response must have empty passageIds array');

  console.log('\nTest 7: Valid AI JSON schema validation');
  const validMock = {
    mode: 'CLARIFY',
    nextStage: 'ROOT_CONCERN',
    mentorText: 'Valid mentor text',
    clarifyingQuestion: {
      text: 'What troubles you most?',
      options: ['Option 1', 'Option 2'],
      allowFreeText: true
    },
    theme: 'SELF_BELIEF',
    passageIds: [],
    interpretation: null,
    reflectionQuestion: null,
    suggestedActions: []
  };
  assert(validateResponse(validMock) === true, 'JSON schema validator should accept canonical response object');

  console.log('\nTest 8: Invalid AI JSON schema rejection');
  const invalidMock = {
    mode: 'INVALID_MODE',
    mentorText: 'Missing nextStage and other fields'
  };
  assert(validateResponse(invalidMock) === false, 'JSON schema validator must reject invalid mode enum or missing required fields');

  console.log('\nTest 9: Invalid passage ID handling');
  const badPassageResp = await generateMentorResponse({
    stage: 'TEACHING',
    userMessage: 'Test user message',
    retrievedPassages: [{ passageId: 'INVALID_ID_FORMAT', text: 'Fake' }]
  });
  assert(badPassageResp.passageIds.every((id) => id.startsWith('VIV_')), 'AI response passageIds must filter out invalid IDs');

  console.log('\nTest 10: Verify no fabricated quotation field in AI response');
  const teachingResp = await generateMentorResponse({
    stage: 'TEACHING',
    userMessage: 'I feel weak',
    retrievedPassages: [{ passageId: 'VIV_001', score: 0.9, text: 'The remedy for weakness...', topics: ['self_belief'] }]
  });
  assert(teachingResp.quote === undefined, 'AI response must NOT contain a top-level quote string');
  assert(teachingResp.exact_text === undefined, 'AI response must NOT contain exact_text string field');

  console.log('\nTest 11: Stage-specific behavior throughout reflection journey');
  const understandResp = await generateMentorResponse({ stage: 'UNDERSTAND', userMessage: 'I failed my exam.' });
  assert(understandResp.mode === 'CLARIFY' && understandResp.nextStage === 'CLARIFY', 'UNDERSTAND stage should route to CLARIFY');

  const clarifyResp = await generateMentorResponse({ stage: 'CLARIFY', userMessage: 'I failed my exam.' });
  assert(clarifyResp.clarifyingQuestion !== null, 'CLARIFY stage must provide a clarifyingQuestion object');

  const rootResp = await generateMentorResponse({ stage: 'ROOT_CONCERN', userMessage: 'I think I am not intelligent.' });
  assert(rootResp.reflectionQuestion !== null, 'ROOT_CONCERN stage must provide a reflectionQuestion');

  const actionResp = await generateMentorResponse({ stage: 'ACTION', userMessage: 'What should I do?' });
  assert(Array.isArray(actionResp.suggestedActions) && actionResp.suggestedActions.length > 0, 'ACTION stage must suggest practical user actions');

  console.log('\nTest 12: Empty user message handling');
  const emptyResp = await generateMentorResponse({ stage: 'UNDERSTAND', userMessage: '' });
  assert(validateResponse(emptyResp) === true, 'AI response for empty user message must still produce valid JSON');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passedTests} Passed | ${failedTests} Failed`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
