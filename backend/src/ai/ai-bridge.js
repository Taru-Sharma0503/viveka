/**
 * ai-bridge.js
 *
 * Adapter that calls the /ai layer (CJS) from the backend (ESM) and maps
 * the /ai response schema to the backend's canonical mentorResponseSchema.
 *
 * ARCHITECTURE RULE:
 *   backend → backend/src/ai/ai-bridge.js → /ai/index.js → Gemini + Groq + RAG + Qdrant
 *
 * The /ai layer uses CommonJS (require), so we use createRequire to load it
 * from this ESM module.
 *
 * FALLBACK LOGIC:
 *   If the /ai layer returns a response that is missing stage-critical fields
 *   (e.g., no question for ROOT_CONCERN, no teaching for TEACHING), we return
 *   null so the backend's local fallback handler takes over. This ensures the
 *   backend always produces a complete, valid response.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/db.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the CJS AI layer using createRequire (backend is ESM, /ai is CJS)
const require = createRequire(import.meta.url);

let _aiModule = null;

/**
 * Lazily loads and caches the /ai module.
 * Returns false if the module cannot be loaded (graceful degradation).
 */
function loadAiModule() {
  if (_aiModule !== null) return _aiModule;
  try {
    const aiIndexPath = path.resolve(__dirname, '../../../ai/index.js');
    _aiModule = require(aiIndexPath);
    console.log('[AI Bridge] Successfully loaded /ai module');
  } catch (err) {
    console.warn('[AI Bridge] Could not load /ai module, will use fallback:', err.message);
    _aiModule = false;
  }
  return _aiModule;
}

/**
 * Map topic from backend format → /ai theme format.
 * Backend topics: FAILURE, FEAR, ANGER, PURPOSE, RELATIONSHIPS, WORK, GRIEF, GENERAL
 * AI themes:      FAILURE, FEAR, SELF_BELIEF, CONFUSION, DECISION, MOTIVATION,
 *                 CONCENTRATION, RESPONSIBILITY, RELATIONSHIPS, COURAGE, DISCIPLINE, EFFORT, OTHER
 */
function mapTopicToTheme(topic) {
  const map = {
    FAILURE: 'FAILURE',
    FEAR: 'FEAR',
    ANGER: 'COURAGE',
    PURPOSE: 'MOTIVATION',
    RELATIONSHIPS: 'RELATIONSHIPS',
    WORK: 'DISCIPLINE',
    GRIEF: 'OTHER',
    GENERAL: 'OTHER',
  };
  return map[(topic || '').toUpperCase()] || 'OTHER';
}

/**
 * Build conversationContext expected by /ai from backend session data.
 */
function buildConversationContext({ topic, history = [], completedStages = [], contextData = {} }) {
  const userMessages = history.filter((msg) => msg.sender === 'USER');
  const originalProblem = userMessages.length > 0 ? userMessages[0].text : '';

  return {
    topic: mapTopicToTheme(topic),
    isHighRisk: false,
    completedStages,
    passageId: contextData.passageId || null,
    originalProblem,
    history: history.map((msg) => ({
      role: msg.sender === 'USER' ? 'user' : 'assistant',
      content: msg.text,
    })),
  };
}

/**
 * Resolve a Teaching object from a passageId.
 *
 * First tries the backend DB (which uses passage_XXX IDs).
 * Returns null if the passage is not found.
 */
async function resolveTeachingFromPassageId(passageId) {
  if (!passageId || typeof passageId !== 'string') return null;
  try {
    const passage = await dbService.getPassageById(passageId);
    if (!passage) return null;
    return {
      passageId: passage.passageId,
      quote: passage.exactText,
      title: passage.title,
      work: passage.work,
      section: passage.section || null,
      sourceUrl: passage.sourceUrl || null,
      verified: true,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a Teaching object by topic when no direct passageId match is found.
 * Falls back to any passage matching the given topic in the backend DB.
 */
async function resolveTeachingByTopic(topic) {
  try {
    const candidates = topic
      ? await dbService.getPassagesByTopic(topic)
      : await dbService.getAllPassages();
    if (!candidates || candidates.length === 0) return null;
    const passage = candidates[0];
    return {
      passageId: passage.passageId,
      quote: passage.exactText,
      title: passage.title,
      work: passage.work,
      section: passage.section || null,
      sourceUrl: passage.sourceUrl || null,
      verified: true,
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether the mapped response satisfies stage-specific requirements.
 * Returns true if the response is complete enough to use; false to trigger local fallback.
 *
 * These invariants mirror the backend test expectations.
 */
function isStageSufficient(stage, mapped) {
  switch (stage) {
    case 'ROOT_CONCERN':
      // Must have a question (clarifying question or mapped reflection question) with options or text
      return !!(mapped.question && mapped.question.text);
    case 'TEACHING':
      // Must have a resolved teaching with verified=true and a non-empty quote
      return !!(mapped.teaching && mapped.teaching.verified && mapped.teaching.quote);
    case 'REFLECT':
      // Must have reflection (explanation + question) or mentorMessage
      return !!(
        (mapped.reflection && mapped.reflection.explanation && mapped.reflection.question) ||
        (mapped.mentorMessage && mapped.mentorMessage.text && mapped.teaching)
      );
    case 'ACTION':
      // Must have at least one action with id, text
      return !!(
        Array.isArray(mapped.actions) &&
        mapped.actions.length > 0 &&
        mapped.actions[0].id &&
        mapped.actions[0].text
      );
    default:
      // For other stages, just require a non-empty mentor message
      return !!(mapped.mentorMessage && mapped.mentorMessage.text);
  }
}

/**
 * Maps the /ai layer response (ai-response.schema.json) to the backend's
 * mentorResponseSchema (output-schema.js).
 */
async function mapAiResponseToBackendSchema(aiResponse, stage, completedStages, topic) {
  // 1. Mentor message
  const mentorMessage = {
    id: uuidv4(),
    text: aiResponse.mentorText || '',
  };

  // 2. Question (clarifyingQuestion or reflectionQuestion → question)
  let question = aiResponse.clarifyingQuestion
    ? {
        text: aiResponse.clarifyingQuestion.text,
        options: aiResponse.clarifyingQuestion.options || [],
        allowFreeText:
          aiResponse.clarifyingQuestion.allowFreeText !== undefined
            ? aiResponse.clarifyingQuestion.allowFreeText
            : true,
      }
    : aiResponse.reflectionQuestion
    ? {
        text: aiResponse.reflectionQuestion,
        options: [
          'I assumed this single event defines my future',
          'I forgot that skills develop through struggle',
          'I focused too much on other people\'s opinions',
          'Something else',
        ],
        allowFreeText: true,
      }
    : null;

  // 3. Teaching — resolve from passageIds against backend DB first
  let teaching = null;
  if (Array.isArray(aiResponse.passageIds) && aiResponse.passageIds.length > 0) {
    for (const pid of aiResponse.passageIds) {
      teaching = await resolveTeachingFromPassageId(pid);
      if (teaching) break;
    }
  }
  // If no passageId resolved (e.g., VIV_XXX not in backend DB), fall back to topic-based lookup
  if (!teaching && (stage === 'TEACHING' || stage === 'REFLECT')) {
    teaching = await resolveTeachingByTopic(topic);
    // Last resort: hardcoded anchor passage
    if (!teaching) {
      teaching = await resolveTeachingFromPassageId('passage_023');
    }
  }

  // 4. Reflection — build from interpretation + reflectionQuestion for REFLECT stage
  let reflection = null;
  if (stage === 'REFLECT') {
    const reflectionExplanation = aiResponse.interpretation || aiResponse.mentorText || '';
    const reflectionQuestion = aiResponse.reflectionQuestion || (question ? question.text : '');
    if (reflectionExplanation || reflectionQuestion) {
      reflection = {
        explanation: reflectionExplanation,
        question: reflectionQuestion,
      };
    }
  }


  // 5. Actions — add required `id` field
  const actions = Array.isArray(aiResponse.suggestedActions)
    ? aiResponse.suggestedActions.map((a, i) => ({
        id: `ai_action_${i + 1}_${Date.now()}`,
        text: a.text,
        estimatedMinutes: a.estimatedMinutes ?? null,
      }))
    : [];

  // 6. Mode — pass through (both schemas share the same enum values)
  const mode = aiResponse.mode || 'REFLECT';

  return {
    stage,
    mode,
    mentorMessage,
    question,
    teaching,
    reflection,
    actions,
    journey: {
      currentStage: stage,
      completedStages: completedStages || [],
    },
  };
}

/**
 * Primary integration function.
 *
 * Calls /ai/index.js generateMentorResponse with backend parameters
 * mapped to the /ai interface, then maps the response back.
 *
 * Returns null if:
 *   - /ai module is unavailable
 *   - /ai returns null/error
 *   - Mapped response fails stage-specific completeness check
 *   (caller uses local fallback in all null cases)
 *
 * @param {Object} params - Same params as backend AiService.generateMentorResponse
 * @returns {Promise<Object|null>}
 */
export async function callAiLayer({
  stage,
  mode,
  topic,
  userMessage,
  history = [],
  completedStages = [],
  contextData = {},
}) {
  const aiModule = loadAiModule();
  if (!aiModule) return null;

  const { generateMentorResponse } = aiModule;
  if (typeof generateMentorResponse !== 'function') {
    console.warn('[AI Bridge] generateMentorResponse is not a function in /ai module');
    return null;
  }

  const previousStage =
    completedStages.length > 0 ? completedStages[completedStages.length - 1] : null;

  const conversationContext = buildConversationContext({
    topic,
    history,
    completedStages,
    contextData,
  });

  // RAG retrieval through the /ai layer (best effort)
  let retrievedPassages = [];
  try {
    if (aiModule.generateContext) {
      const ragResult = await aiModule.generateContext({
        userMessage,
        theme: mapTopicToTheme(topic),
        conversationContext,
        currentStage: stage,
      });
      retrievedPassages = ragResult.passages || [];
    }
  } catch (ragErr) {
    console.warn('[AI Bridge] RAG retrieval failed, continuing without passages:', ragErr.message);
  }

  // Call /ai generateMentorResponse
  let aiResponse;
  try {
    aiResponse = await generateMentorResponse({
      stage,
      userMessage,
      conversationContext,
      retrievedPassages,
      previousStage,
    });
  } catch (err) {
    console.warn('[AI Bridge] generateMentorResponse threw, using fallback:', err.message);
    return null;
  }

  if (!aiResponse) {
    console.warn('[AI Bridge] generateMentorResponse returned null/undefined');
    return null;
  }

  // Map the /ai response to the backend schema
  const mapped = await mapAiResponseToBackendSchema(
    aiResponse,
    stage,
    completedStages,
    topic
  );

  // Stage-specific completeness check: if critical fields are missing, fall through
  if (!isStageSufficient(stage, mapped)) {
    console.warn(
      `[AI Bridge] Stage ${stage} response missing critical fields, using local fallback`
    );
    return null;
  }

  return mapped;
}
