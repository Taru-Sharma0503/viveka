import { v4 as uuidv4 } from 'uuid';
import { dbService } from './db.service.js';
import { AiService } from '../ai/ai.service.js';
import { createError } from '../utils/errors.js';

export class ActionService {
  /**
   * Save an action chosen by the user
   */
  static async saveAction({ sessionId, actionText, reviewDue = null }) {
    const session = await dbService.getSessionById(sessionId);
    if (!session) {
      throw createError.sessionNotFound(sessionId);
    }

    const actionId = uuidv4();
    const action = await dbService.createAction({
      id: actionId,
      sessionId,
      actionText,
      status: 'PENDING',
      reviewDue,
    });

    return {
      actionId: action.id,
      actionText: action.actionText,
      status: action.status,
      reviewDue: action.reviewDue
        ? (action.reviewDue instanceof Date ? action.reviewDue : new Date(action.reviewDue)).toISOString()
        : null,
    };
  }

  /**
   * Review an existing action
   */
  static async reviewAction({ actionId, status, note = null, helpfulnessRating = null }) {
    const action = await dbService.getActionById(actionId);
    if (!action) {
      throw createError.actionNotFound(actionId);
    }

    // Update action status
    await dbService.updateAction(actionId, { status });

    // Generate reflective closing loop / next step
    const nextStep = AiService.generateReviewNextStep({
      actionText: action.actionText,
      status,
      note,
      helpfulnessRating,
    });

    const reviewId = uuidv4();
    const review = await dbService.createActionReview({
      id: reviewId,
      actionId,
      status,
      note,
      helpfulnessRating,
      nextStepText: nextStep.text,
    });

    return {
      reviewId: review.id,
      actionId: action.id,
      status: review.status,
      nextStep: {
        text: review.nextStepText,
      },
    };
  }
}
