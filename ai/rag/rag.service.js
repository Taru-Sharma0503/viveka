const { retrieveRelevantPassages } = require('./retrieve');

const THEME_TOPIC_MAP = {
  FEAR: ['fear', 'courage', 'strength'],
  COURAGE: ['courage', 'self_belief', 'strength'],
  SELF_DOUBT: ['self_doubt', 'self_belief', 'strength'],
  FAILURE: ['failure', 'effort', 'courage', 'perseverance'],
  SELF_BELIEF: ['self_belief', 'fear', 'motivation', 'self_doubt'],
  MOTIVATION: ['motivation', 'effort', 'purpose'],
  CONCENTRATION: ['concentration', 'discipline'],
  RESPONSIBILITY: ['responsibility', 'discipline', 'purpose'],
  RELATIONSHIPS: ['relationships'],
  DISCIPLINE: ['discipline', 'concentration', 'action'],
  EFFORT: ['effort', 'failure', 'perseverance'],
  DECISION: ['decision', 'self_belief', 'purpose'],
  CONFUSION: ['confusion', 'decision'],
  PERSEVERANCE: ['perseverance', 'effort', 'failure'],
  PURPOSE: ['purpose', 'motivation', 'self_belief'],
  ACTION: ['action', 'discipline', 'effort'],
  OTHER: []
};

/**
 * Classify high-level theme from user message if not already provided.
 * @param {string} text
 * @returns {string} theme
 */
function classifyTheme(text = '') {
  const lower = text.toLowerCase();

  if (lower.includes('scared') || lower.includes('fear') || lower.includes('afraid') || lower.includes('terrified')) {
    return 'FEAR';
  }
  if (lower.includes('fail') || lower.includes('failed') || lower.includes('mistake') || lower.includes('useless')) {
    return 'FAILURE';
  }
  if (lower.includes('doubt') || lower.includes('incapable') || lower.includes('not smart') || lower.includes('weak')) {
    return 'SELF_DOUBT';
  }
  if (lower.includes('focus') || lower.includes('distracted') || lower.includes('concentrate')) {
    return 'CONCENTRATION';
  }
  if (lower.includes('lazy') || lower.includes('unmotivated') || lower.includes('give up')) {
    return 'MOTIVATION';
  }
  if (lower.includes('blame') || lower.includes('responsible') || lower.includes('destiny')) {
    return 'RESPONSIBILITY';
  }
  if (lower.includes('relationship') || lower.includes('friend') || lower.includes('parent') || lower.includes('people')) {
    return 'RELATIONSHIPS';
  }
  if (lower.includes('confused') || lower.includes('uncertain') || lower.includes('don\'t know')) {
    return 'CONFUSION';
  }
  if (lower.includes('decide') || lower.includes('choice') || lower.includes('option')) {
    return 'DECISION';
  }
  if (lower.includes('brave') || lower.includes('bold') || lower.includes('courage')) {
    return 'COURAGE';
  }
  if (lower.includes('purpose') || lower.includes('goal') || lower.includes('meaning')) {
    return 'PURPOSE';
  }

  return 'OTHER';
}

/**
 * RAG Service: generateContext({ userMessage, theme, conversationContext, currentStage })
 */
async function generateContext({ userMessage, theme = null, conversationContext = null, currentStage = 'TEACHING' }) {
  const query = userMessage || (conversationContext ? conversationContext.summary : '');
  const activeTheme = theme || (conversationContext ? conversationContext.topic : null) || classifyTheme(query);

  const mappedTopics = THEME_TOPIC_MAP[activeTheme] || [];

  const passages = await retrieveRelevantPassages({
    query,
    topics: mappedTopics,
    topK: 3
  });

  return {
    query,
    theme: activeTheme,
    passages: passages.map((p) => ({
      passageId: p.passageId,
      score: p.score,
      text: p.text,
      topics: p.topics
    }))
  };
}

module.exports = { generateContext, classifyTheme, THEME_TOPIC_MAP };
