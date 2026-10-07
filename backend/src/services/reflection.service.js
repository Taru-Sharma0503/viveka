import { v4 as uuidv4 } from 'uuid';
import { dbService } from './db.service.js';
import { ReflectionStateMachine } from '../state/state-machine.js';
import { SafetyService } from './safety.service.js';
import { AiService } from '../ai/ai.service.js';
import { createError } from '../utils/errors.js';

export class ReflectionService {
  /**
   * Process a message within an existing reflection session
   * @param {Object} params
   * @param {string} params.sessionId
   * @param {string} params.message
   * @param {boolean} [params.isSafetyCrisis]
   */
  static async processMessage({ sessionId, message, isSafetyCrisis = false }) {
    // 1. Validate session existence
    const session = await dbService.getSessionById(sessionId);
    if (!session) {
      throw createError.sessionNotFound(sessionId);
    }

    const completedStages = Array.isArray(session.completedStages)
      ? session.completedStages
      : [];

    // 2. Safety Gate Check
    const safetyCheck = isSafetyCrisis ? { isCrisis: true } : SafetyService.evaluate(message);
    if (safetyCheck.isCrisis) {
      // Save user message
      await dbService.createMessage({
        id: uuidv4(),
        sessionId,
        sender: 'USER',
        text: message,
        stage: session.currentStage,
        mode: 'HUMAN_SUPPORT',
      });

      const supportResponse = SafetyService.createHumanSupportResponse(
        session.currentStage,
        completedStages
      );

      // Save mentor crisis response
      await dbService.createMessage({
        id: supportResponse.mentorMessage.id,
        sessionId,
        sender: 'MENTOR',
        text: supportResponse.mentorMessage.text,
        stage: session.currentStage,
        mode: supportResponse.mode,
        metadata: supportResponse,
      });

      return supportResponse;
    }

    // 3. Persist incoming user message
    await dbService.createMessage({
      id: uuidv4(),
      sessionId,
      sender: 'USER',
      text: message,
      stage: session.currentStage,
    });

    // 4. Calculate stage transition
    const { nextStage, nextCompletedStages, mode } = ReflectionStateMachine.transition(
  session.currentStage,
  completedStages,
  session.contextData?.kind
);

    // 5. Generate AI mentor response for the transitioned stage
    const messages = await dbService.getMessagesBySessionId(sessionId);
    const mentorResponse = await AiService.generateMentorResponse({
      stage: nextStage,
      mode,
      topic: session.topic,
      userMessage: message,
      history: messages,
      completedStages: nextCompletedStages,
      contextData: session.contextData || {},
    });

    // 6. Update session state in database
    const contextData = { ...(session.contextData || {}) };
    if (mentorResponse.teaching) {
      contextData.passageId = mentorResponse.teaching.passageId;
    }

    await dbService.updateSession(sessionId, {
      currentStage: nextStage,
      completedStages: nextCompletedStages,
      contextData,
    });

    // 7. Persist mentor message in database
    await dbService.createMessage({
      id: mentorResponse.mentorMessage.id,
      sessionId,
      sender: 'MENTOR',
      text: mentorResponse.mentorMessage.text,
      stage: nextStage,
      mode: mentorResponse.mode,
      metadata: mentorResponse,
    });

    return mentorResponse;
  }
}
