require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { LLMRouter } = require('./providers/llm-router');
const { GeminiProvider } = require('./providers/gemini.provider');
const { GroqProvider } = require('./providers/groq.provider');

// Load JSON Schema
const schemaPath = path.join(__dirname, 'schemas', 'ai-response.schema.json');
const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateResponse = ajv.compile(schemaContent);

// Load System & Stage Prompts
const promptsDir = path.join(__dirname, 'prompts');

function loadPrompt(name) {
  const p = path.join(promptsDir, `${name}.prompt.txt`);
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, 'utf8');
  }
  return '';
}

const systemPromptText = loadPrompt('system');

const stagePrompts = {
  UNDERSTAND: loadPrompt('understand'),
  CLARIFY: loadPrompt('clarify'),
  ROOT_CONCERN: loadPrompt('root-concern'),
  TEACHING: loadPrompt('teaching'),
  INTERPRET: loadPrompt('teaching'),
  REFLECT: loadPrompt('reflection'),
  CHOOSE: loadPrompt('action'),
  ACT: loadPrompt('action'),
  ACTION: loadPrompt('action'),
  REVIEW: loadPrompt('review')
};

/**
 * Returns a HUMAN_SUPPORT response when high risk or crisis is flagged.
 */
function buildHumanSupportResponse() {
  return {
    mode: 'HUMAN_SUPPORT',
    nextStage: 'COMPLETED',
    mentorText: 'I hear that you are going through a deeply overwhelming time. While I am an AI mentor here for reflection, your safety and well-being are paramount. Please connect with a qualified human professional or crisis counselor who can support you right now.',
    clarifyingQuestion: null,
    theme: 'OTHER',
    passageIds: [],
    interpretation: null,
    reflectionQuestion: null,
    suggestedActions: [
      {
        text: 'Contact a local crisis helpline or healthcare professional.',
        estimatedMinutes: 5
      },
      {
        text: 'Reach out to a trusted friend, family member, or mentor.',
        estimatedMinutes: 10
      }
    ]
  };
}

/**
 * Returns a NO_SOURCE response when no relevant passage is found.
 */
function buildNoSourceResponse(userMessage, theme = 'OTHER') {
  return {
    mode: 'NO_SOURCE',
    nextStage: 'REFLECT',
    mentorText: 'I could not find a sufficiently relevant documented teaching in the current collection for this query. Rather than force a quotation, let us continue exploring your situation.',
    clarifyingQuestion: null,
    theme: theme || 'OTHER',
    passageIds: [],
    interpretation: null,
    reflectionQuestion: 'What core principle or personal value feels most important to guide your next decision here?',
    suggestedActions: []
  };
}

/**
 * Fallback response generator for offline execution or unit tests.
 */
function buildMockResponse(stage, userMessage, retrievedPassages = [], theme = 'SELF_BELIEF') {
  const activeStage = (stage || 'UNDERSTAND').toUpperCase();

  switch (activeStage) {
    case 'UNDERSTAND':
      return {
        mode: 'CLARIFY',
        nextStage: 'CLARIFY',
        mentorText: 'I hear how deeply this situation has affected you. Before deciding what to do, let us understand what this experience means to you.',
        clarifyingQuestion: {
          text: 'What part of this situation feels heaviest for you right now?',
          options: [
            'I feel I failed my own expectations',
            'I am worried about what others will think',
            'I am uncertain about my future path'
          ],
          allowFreeText: true
        },
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: null,
        suggestedActions: []
      };

    case 'CLARIFY':
      return {
        mode: 'CLARIFY',
        nextStage: 'ROOT_CONCERN',
        mentorText: 'Thank you for sharing that. Let us narrow down what troubles you most.',
        clarifyingQuestion: {
          text: 'What does this outcome make you believe about yourself?',
          options: [
            'I think it proves I am not capable',
            'I feel I lack the necessary discipline',
            'I fear I will repeat the same mistake'
          ],
          allowFreeText: true
        },
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: null,
        suggestedActions: []
      };

    case 'ROOT_CONCERN':
      return {
        mode: 'REFLECT',
        nextStage: 'TEACHING',
        mentorText: 'Let us examine the belief underneath this problem. Often we mistake a single outcome for a complete reflection of who we are.',
        clarifyingQuestion: null,
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: 'If a close friend experienced this exact result, would you conclude they were incapable? What makes the conclusion feel different when it is about you?',
        suggestedActions: []
      };

    case 'TEACHING':
    case 'INTERPRET':
      if (!retrievedPassages || retrievedPassages.length === 0) {
        return buildNoSourceResponse(userMessage, theme);
      }
      const topPassage = retrievedPassages[0];
      return {
        mode: 'TEACHING',
        nextStage: 'REFLECT',
        mentorText: 'Consider this documented teaching regarding strength and self-belief.',
        clarifyingQuestion: null,
        theme: theme || 'SELF_BELIEF',
        passageIds: [topPassage.passageId || topPassage.id || 'VIV_001'],
        interpretation: 'This teaching suggests that focus should be placed on inherent strength rather than dwelling on temporary setbacks.',
        reflectionQuestion: null,
        suggestedActions: []
      };

    case 'REFLECT':
      return {
        mode: 'REFLECT',
        nextStage: 'CHOOSE',
        mentorText: 'Now let us consider how this perspective applies directly to your current situation.',
        clarifyingQuestion: null,
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: 'Where in your situation are you treating one result as a judgment of your entire ability?',
        suggestedActions: []
      };

    case 'CHOOSE':
    case 'ACT':
    case 'ACTION':
      return {
        mode: 'ACTION',
        nextStage: 'ACT',
        mentorText: 'Here are a few small, practical steps you could consider to move forward with autonomy.',
        clarifyingQuestion: null,
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: null,
        suggestedActions: [
          {
            text: 'Analyse the specific questions or steps where mistakes occurred.',
            estimatedMinutes: 20
          },
          {
            text: 'Write down one actionable skill to practice before the next attempt.',
            estimatedMinutes: 10
          }
        ]
      };

    case 'REVIEW':
      return {
        mode: 'REVIEW',
        nextStage: 'COMPLETED',
        mentorText: 'Reflecting on the action you took is how true learning consolidates.',
        clarifyingQuestion: null,
        theme: theme || 'SELF_BELIEF',
        passageIds: [],
        interpretation: null,
        reflectionQuestion: 'What did you discover about your capability when you analysed your mistakes?',
        suggestedActions: []
      };

    default:
      return buildMockResponse('UNDERSTAND', userMessage, retrievedPassages, theme);
  }
}

// Instantiate default router with test fallback generator
const router = new LLMRouter({
  mockFallbackGenerator: ({ systemPrompt, userPrompt }) => {
    const stageMatch = userPrompt.match(/CURRENT STAGE:\s*(\w+)/);
    const stage = stageMatch ? stageMatch[1] : 'UNDERSTAND';
    const themeMatch = userPrompt.match(/THEME:\s*(\w+)/);
    const theme = themeMatch ? themeMatch[1] : 'SELF_BELIEF';
    let retrievedPassages = [];
    try {
      const match = userPrompt.match(/RETRIEVED PASSAGES \([^)]*\):\s*(\[[\s\S]*?\])\s*\n\n/);
      if (match && match[1]) {
        retrievedPassages = JSON.parse(match[1]);
      }
    } catch (e) {}
    return buildMockResponse(stage, userPrompt, retrievedPassages, theme);
  }
});

/**
 * Core AI Service Function
 * generateMentorResponse({ stage, userMessage, conversationContext, retrievedPassages, previousStage })
 */
async function generateMentorResponse({
  stage = 'UNDERSTAND',
  userMessage = '',
  conversationContext = null,
  retrievedPassages = [],
  previousStage = null
}) {
  // 1. Safety Check (High Risk / Human Support Routing)
  const isHighRisk =
    (conversationContext && conversationContext.isHighRisk) ||
    /suicide|self-harm|end my life|kill myself|want to die|harm myself/i.test(userMessage);

  if (isHighRisk || stage === 'HUMAN_SUPPORT') {
    return buildHumanSupportResponse();
  }

  // 2. NO_SOURCE handling for TEACHING stage if no relevant passages retrieved
  if (stage === 'TEACHING' && (!retrievedPassages || retrievedPassages.length === 0)) {
    return buildNoSourceResponse(userMessage, conversationContext ? conversationContext.topic : 'OTHER');
  }

  // 3. Assemble Prompt
  const currentStagePrompt = stagePrompts[stage.toUpperCase()] || stagePrompts.UNDERSTAND;
  const theme = (conversationContext && conversationContext.topic) || 'SELF_BELIEF';

  const userPromptText = `
CURRENT STAGE: ${stage}
PREVIOUS STAGE: ${previousStage || 'NONE'}
THEME: ${theme}
USER MESSAGE: "${userMessage}"

CONVERSATION CONTEXT:
${JSON.stringify(conversationContext || {}, null, 2)}

RETRIEVED PASSAGES (IDs and metadata only):
${JSON.stringify(
    retrievedPassages.map((p) => ({
      passageId: p.passageId || p.id,
      score: p.score,
      topics: p.topics,
      work: p.work
    })),
    null,
    2
  )}

${currentStagePrompt}

IMPORTANT INSTRUCTION: Output ONLY valid JSON matching the schema.
`;

  // 4. Execute Router (Gemini Primary -> Groq Fallback)
  let responseObj;
  try {
    responseObj = await router.generate({
      systemPrompt: systemPromptText,
      userPrompt: userPromptText
    });
  } catch (err) {
    if (process.env.AI_MOCK_MODE === 'true') {
      responseObj = buildMockResponse(stage, userMessage, retrievedPassages, theme);
    } else {
      console.error(`[AI Service Error]: ${err.message}`);
      throw err;
    }
  }

  if (!responseObj) {
    if (process.env.AI_MOCK_MODE === 'true') {
      responseObj = buildMockResponse(stage, userMessage, retrievedPassages, theme);
    } else {
      const err = new Error('AI Generation returned empty response');
      err.code = 'LLM_GENERATION_UNAVAILABLE';
      throw err;
    }
  }

  // 5. Enforce Schema Validation
  const valid = validateResponse(responseObj);
  if (!valid) {
    console.warn(`[AI Service]: Response failed schema validation. Errors:`, validateResponse.errors);
    if (process.env.AI_MOCK_MODE === 'true') {
      responseObj = buildMockResponse(stage, userMessage, retrievedPassages, theme);
    } else {
      const schemaErr = new Error('AI response failed JSON schema validation');
      schemaErr.code = 'AI_INVALID_RESPONSE';
      schemaErr.validationErrors = validateResponse.errors;
      throw schemaErr;
    }
  }

  // 6. QUOTATION SAFETY ENFORCEMENT (Section 29 & Priority 3)
  if (Array.isArray(responseObj.passageIds)) {
    responseObj.passageIds = responseObj.passageIds
      .map((id) => (typeof id === 'string' ? id : id.passageId || id.id))
      .filter((id) => typeof id === 'string' && (id.startsWith('VIV_') || id.startsWith('passage_')));
  } else {
    responseObj.passageIds = [];
  }

  // Explicitly strip any accidental top-level quote property
  delete responseObj.quote;
  delete responseObj.exact_text;

  return responseObj;
}

module.exports = {
  generateMentorResponse,
  buildHumanSupportResponse,
  buildNoSourceResponse,
  buildMockResponse,
  validateResponse,
  router
};
