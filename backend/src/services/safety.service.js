import { MODES } from '../state/stages.js';
import { v4 as uuidv4 } from 'uuid';

const CRISIS_PATTERNS = [
  /suicid/i,
  /kill\s+(my|one)?self/i,
  /end\s+(my|this)\s+life/i,
  /want\s+to\s+die/i,
  /harm\s+(my|one)?self/i,
  /slit\s+my/i,
  /cut\s+my\s*(wrist|arm|vein)/i,
  /hang\s+myself/i,
  /no\s+reason\s+to\s+live/i,
  /better\s+off\s+dead/i,
  /can't\s+go\s+on\s+living/i,
  /take\s+my\s+own\s+life/i,
];

export class SafetyService {
  /**
   * Evaluates text for safety concerns / crisis indicators
   * @param {string} text
   * @returns {{ isCrisis: boolean, reason?: string }}
   */
  static evaluate(text) {
    if (!text || typeof text !== 'string') {
      return { isCrisis: false };
    }

    const trimmed = text.trim();
    for (const pattern of CRISIS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isCrisis: true,
          reason: 'Self-harm or crisis keywords detected',
        };
      }
    }

    return { isCrisis: false };
  }

  /**
   * Builds the safe HUMAN_SUPPORT mentor response
   */
  static createHumanSupportResponse(currentStage = 'UNDERSTAND', completedStages = []) {
    return {
      stage: currentStage,
      mode: MODES.HUMAN_SUPPORT,
      mentorMessage: {
        id: uuidv4(),
        text: 'I hear how deeply difficult things are right now. Your safety and well-being are what matters most. While I am an AI reflective mentor, you deserve immediate, compassionate human support from people trained to be with you in this moment.',
      },
      question: {
        text: 'Would you reach out to one of these free, confidential crisis resources right now?',
        options: [
          'Tele-MANAS: Call 14416 or 1800-891-4416 (24/7 Toll-free)',
          'Vandrevala Foundation: Call 9999 666 555 (24/7 Helpline)',
          'AASRA: Call +91-9820466726 (24/7)',
          'National Crisis Lifeline: Call or text 988',
        ],
        allowFreeText: false,
      },
      teaching: null,
      reflection: null,
      actions: [],
      journey: {
        currentStage,
        completedStages,
      },
    };
  }
}
