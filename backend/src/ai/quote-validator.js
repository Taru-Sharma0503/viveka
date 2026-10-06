import { dbService } from '../services/db.service.js';
import { createError } from '../utils/errors.js';

export class QuoteValidator {
  /**
   * Validate that a passageId exists in the canonical corpus and construct a verified Teaching object.
   * Model-supplied quotes are never trusted directly; exact text is strictly retrieved from the database.
   *
   * @param {string} passageId
   * @returns {Promise<import('./output-schema.js').Teaching>}
   */
  static async validateAndBuildTeaching(passageId) {
    if (!passageId || typeof passageId !== 'string') {
      throw createError.quoteValidationFailed('No passage ID provided for verification');
    }

    const passage = await dbService.getPassageById(passageId);

    if (!passage) {
      throw createError.quoteValidationFailed(
        `Passage ID "${passageId}" does not exist in canonical Swami Vivekananda corpus`
      );
    }

    // Ensure the quote is exact from our database record, verified = true
    return {
      passageId: passage.passageId,
      quote: passage.exactText,
      title: passage.title,
      work: passage.work,
      section: passage.section || null,
      sourceUrl: passage.sourceUrl || null,
      verified: true,
    };
  }

  /**
   * Safe check without throwing
   */
  static async isValidPassageId(passageId) {
    if (!passageId) return false;
    const passage = await dbService.getPassageById(passageId);
    return !!passage;
  }
}
