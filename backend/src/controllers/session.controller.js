import { SessionService } from '../services/session.service.js';
import { ReflectionService } from '../services/reflection.service.js';
import { sendSuccess } from '../utils/response.js';

export class SessionController {
  /**
   * API 1 — Create Session
   * POST /api/v1/sessions
   */
  static async createSession(req, res, next) {
    try {
      const { topic, initialMessage } = req.validatedBody;
      const data = await SessionService.createSession({ topic, initialMessage });
      return sendSuccess(res, data, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API 2 — Send Message
   * POST /api/v1/sessions/:sessionId/messages
   */
  static async sendMessage(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { message } = req.validatedBody;
      const data = await ReflectionService.processMessage({
        sessionId,
        message,
        isSafetyCrisis: !!req.isSafetyCrisis,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API 3 — Get Session
   * GET /api/v1/sessions/:sessionId
   */
  static async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const data = await SessionService.getSession(sessionId);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API 7 — Delete Session
   * DELETE /api/v1/sessions/:sessionId
   */
  static async deleteSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const data = await SessionService.deleteSession(sessionId);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }
}
