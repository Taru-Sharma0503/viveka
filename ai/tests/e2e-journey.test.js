process.env.AI_MOCK_MODE = 'true';

const { generateMentorResponse, validateResponse } = require('../ai.service');
const { generateContext } = require('../rag/rag.service');
const { resolvePassageById } = require('../rag/retrieve');

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runEndToEndJourneyTests() {
  console.log('\n--- END-TO-END REFLECTION JOURNEY TEST SUITE ---');
  console.log('Scenario: "I failed my exam and now I think I am useless."\n');

  const userInitialMessage = 'I failed my exam and now I think I am useless.';
  const conversationContext = {
    topic: 'FAILURE',
    identifiedBelief: 'Failure means I am not capable.'
  };

  // Stage 1: UNDERSTAND
  console.log('Step 1: Stage UNDERSTAND');
  const stage1 = await generateMentorResponse({
    stage: 'UNDERSTAND',
    userMessage: userInitialMessage,
    conversationContext
  });
  assert(validateResponse(stage1) === true, 'Stage 1 response must conform to JSON schema');
  assert(stage1.mode === 'CLARIFY', 'Stage 1 mode must be CLARIFY');
  assert(stage1.nextStage === 'CLARIFY', 'Stage 1 nextStage must be CLARIFY');
  assert(stage1.clarifyingQuestion !== null && typeof stage1.clarifyingQuestion.text === 'string', 'Stage 1 must include a clarifying question');
  assert(stage1.quote === undefined && stage1.exact_text === undefined, 'Stage 1 must NOT contain top-level quotation text');

  // Stage 2: CLARIFY
  console.log('Step 2: Stage CLARIFY');
  const stage2 = await generateMentorResponse({
    stage: 'CLARIFY',
    previousStage: 'UNDERSTAND',
    userMessage: 'I feel I disappointed my own expectations.',
    conversationContext
  });
  assert(validateResponse(stage2) === true, 'Stage 2 response must conform to JSON schema');
  assert(stage2.mode === 'CLARIFY', 'Stage 2 mode must be CLARIFY');
  assert(stage2.nextStage === 'ROOT_CONCERN', 'Stage 2 nextStage must be ROOT_CONCERN');
  assert(stage2.clarifyingQuestion !== null && Array.isArray(stage2.clarifyingQuestion.options), 'Stage 2 must provide options');

  // Stage 3: ROOT_CONCERN
  console.log('Step 3: Stage ROOT_CONCERN');
  const stage3 = await generateMentorResponse({
    stage: 'ROOT_CONCERN',
    previousStage: 'CLARIFY',
    userMessage: 'I think failing this exam proves that I am not intelligent.',
    conversationContext
  });
  assert(validateResponse(stage3) === true, 'Stage 3 response must conform to JSON schema');
  assert(stage3.mode === 'REFLECT', 'Stage 3 mode must be REFLECT');
  assert(stage3.nextStage === 'TEACHING', 'Stage 3 nextStage must be TEACHING');
  assert(typeof stage3.reflectionQuestion === 'string' && stage3.reflectionQuestion.length > 0, 'Stage 3 must include a reflection question');

  // Stage 4: TEACHING (RAG Retrieval + Grounded Passage Reference)
  console.log('Step 4: Stage TEACHING');
  const ragContext = await generateContext({
    userMessage: 'In a day when you dont come across any problems',
    theme: 'FAILURE',
    currentStage: 'TEACHING'
  });

  const passagesToPass = ragContext.passages && ragContext.passages.length > 0 ? ragContext.passages : [
    { passageId: 'VIV_007', score: 0.85, text: 'In a day, when you don\'t come across any problems...', topics: ['failure'] }
  ];

  const stage4 = await generateMentorResponse({
    stage: 'TEACHING',
    previousStage: 'ROOT_CONCERN',
    userMessage: 'How should I handle this failure?',
    retrievedPassages: passagesToPass,
    conversationContext
  });
  assert(validateResponse(stage4) === true, 'Stage 4 response must conform to JSON schema');
  assert(stage4.mode === 'TEACHING', 'Stage 4 mode must be TEACHING');
  assert(stage4.nextStage === 'REFLECT', 'Stage 4 nextStage must be REFLECT');
  assert(Array.isArray(stage4.passageIds) && stage4.passageIds.length > 0, 'Stage 4 must return a passage ID reference');
  assert(stage4.passageIds[0].startsWith('VIV_'), `Passage ID must be valid VIV_* format (got ${stage4.passageIds[0]})`);
  assert(stage4.quote === undefined && stage4.exact_text === undefined, 'Stage 4 AI response must NEVER contain top-level quotation text');
  
  // Verify backend quotation resolution
  const quoteDisplayObj = resolvePassageById(stage4.passageIds[0]);
  assert(quoteDisplayObj !== null && quoteDisplayObj.verified === true, 'Backend must be able to resolve exact passage from passageId');

  // Stage 5: REFLECT
  console.log('Step 5: Stage REFLECT');
  const stage5 = await generateMentorResponse({
    stage: 'REFLECT',
    previousStage: 'TEACHING',
    userMessage: 'I see how focusing on strength helps rather than brooding over failure.',
    conversationContext
  });
  assert(validateResponse(stage5) === true, 'Stage 5 response must conform to JSON schema');
  assert(stage5.mode === 'REFLECT', 'Stage 5 mode must be REFLECT');
  assert(stage5.nextStage === 'CHOOSE', 'Stage 5 nextStage must be CHOOSE');
  assert(typeof stage5.reflectionQuestion === 'string', 'Stage 5 must provide a reflection question');

  // Stage 6: ACTION / CHOOSE
  console.log('Step 6: Stage ACTION');
  const stage6 = await generateMentorResponse({
    stage: 'ACTION',
    previousStage: 'REFLECT',
    userMessage: 'What practical steps can I take now?',
    conversationContext
  });
  assert(validateResponse(stage6) === true, 'Stage 6 response must conform to JSON schema');
  assert(stage6.mode === 'ACTION', 'Stage 6 mode must be ACTION');
  assert(stage6.nextStage === 'ACT', 'Stage 6 nextStage must be ACT');
  assert(Array.isArray(stage6.suggestedActions) && stage6.suggestedActions.length > 0, 'Stage 6 must provide user-owned suggested actions');
  assert(typeof stage6.suggestedActions[0].text === 'string', 'Suggested action must have text');

  // Stage 7: REVIEW
  console.log('Step 7: Stage REVIEW');
  const stage7 = await generateMentorResponse({
    stage: 'REVIEW',
    previousStage: 'ACTION',
    userMessage: 'I analyzed the specific questions I got wrong in the exam.',
    conversationContext
  });
  assert(validateResponse(stage7) === true, 'Stage 7 response must conform to JSON schema');
  assert(stage7.mode === 'REVIEW', 'Stage 7 mode must be REVIEW');
  assert(stage7.nextStage === 'COMPLETED', 'Stage 7 nextStage must be COMPLETED');

  console.log('--- END-TO-END REFLECTION JOURNEY TEST PASSED ---\n');
}

module.exports = { runEndToEndJourneyTests };
