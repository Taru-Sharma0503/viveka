import { ActionService } from '../services/action.service.js';
import { sendSuccess } from '../utils/response.js';

export class ActionController {
  /**
   * API 5 — Save Action
   * POST /api/v1/sessions/:sessionId/actions
   */
  static async saveAction(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { actionText, reviewDue } = req.validatedBody;
      const data = await ActionService.saveAction({
        sessionId,
        actionText,
        reviewDue: reviewDue || null,
      });
      return sendSuccess(res, data, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API 6 — Review Action
   * POST /api/v1/actions/:actionId/review
   */
  static async reviewAction(req, res, next) {
    try {
      const { actionId } = req.params;
      const { status, note, helpfulnessRating } = req.validatedBody;
      const data = await ActionService.reviewAction({
        actionId,
        status,
        note: note || null,
        helpfulnessRating: helpfulnessRating ?? null,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }
}
