import { v4 as uuidv4 } from 'uuid';
import { dbService } from './db.service.js';
import { STAGES } from '../state/stages.js';
import { createError } from '../utils/errors.js';

export class SessionService {
  /**
   * Create a new mentorship session
   */
  static async createSession({ topic = null, initialMessage = null }) {
    const sessionId = uuidv4();
    const createdAt = new Date();

    const session = await dbService.createSession({
      id: sessionId,
      topic: topic || null,
      currentStage: STAGES.UNDERSTAND,
      completedStages: [],
      contextData: {},
    });

    if (initialMessage && initialMessage.trim().length > 0) {
      await dbService.createMessage({
        id: uuidv4(),
        sessionId,
        sender: 'USER',
        text: initialMessage.trim(),
        stage: STAGES.UNDERSTAND,
      });
    }

    return {
      sessionId: session.id,
      stage: session.currentStage,
      topic: session.topic,
      createdAt: (session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt)).toISOString(),
    };
  }

  /**
   * Retrieve session by ID
   */
  static async getSession(sessionId) {
    const session = await dbService.getSessionById(sessionId);
    if (!session) {
      throw createError.sessionNotFound(sessionId);
    }

    return {
      sessionId: session.id,
      topic: session.topic,
      currentStage: session.currentStage,
      messages: (session.messages || []).map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        stage: m.stage,
        mode: m.mode || null,
        metadata: m.metadata || null,
        createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
      })),
      actions: (session.actions || []).map((a) => ({
        id: a.id,
        actionText: a.actionText,
        status: a.status,
        reviewDue: a.reviewDue ? (a.reviewDue instanceof Date ? a.reviewDue : new Date(a.reviewDue)).toISOString() : null,
        createdAt: (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).toISOString(),
      })),
      createdAt: (session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt)).toISOString(),
    };
  }

  /**
   * Delete session by ID
   */
  static async deleteSession(sessionId) {
    const existing = await dbService.getSessionById(sessionId);
    if (!existing) {
      throw createError.sessionNotFound(sessionId);
    }

    const deleted = await dbService.deleteSession(sessionId);
    return { deleted: !!deleted };
  }
}
