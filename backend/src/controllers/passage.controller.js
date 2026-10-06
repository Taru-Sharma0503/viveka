import { dbService } from '../services/db.service.js';
import { createError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';

export class PassageController {
  /**
   * API 4 — Get Passage
   * GET /api/v1/passages/:passageId
   */
  static async getPassage(req, res, next) {
    try {
      const { passageId } = req.params;
      const passage = await dbService.getPassageById(passageId);

      if (!passage) {
        throw createError.passageNotFound(passageId);
      }

      return sendSuccess(res, {
        passageId: passage.passageId,
        exactText: passage.exactText,
        title: passage.title,
        work: passage.work,
        section: passage.section || null,
        author: passage.author || 'Swami Vivekananda',
        sourceUrl: passage.sourceUrl || null,
      });
    } catch (err) {
      next(err);
    }
  }
}
