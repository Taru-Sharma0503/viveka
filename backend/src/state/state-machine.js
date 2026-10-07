import { STAGES, STAGE_ORDER, MODES } from './stages.js';
import { createError } from '../utils/errors.js';

export class ReflectionStateMachine {
  /**
   * Determine the next stage and updated completed stages list
   * @param {string} currentStage
   * @param {string[]} completedStages
   * @returns {{ nextStage: string, nextCompletedStages: string[], mode: string }}
   */
  static transition(currentStage, completedStages = [], kind = null) {
  const currentCompleted = Array.isArray(completedStages)
    ? [...completedStages]
    : [];

    switch (currentStage) {
      case STAGES.UNDERSTAND:
        // Transition: UNDERSTAND -> CLARIFY (always ask a follow-up before surfacing root concern)
        return {
          nextStage: STAGES.CLARIFY,
          nextCompletedStages: Array.from(new Set([...currentCompleted, STAGES.UNDERSTAND])),
          mode: MODES.CLARIFY,
        };
      }

      case STAGES.CLARIFY:
        // Transition: CLARIFY -> ROOT_CONCERN
        return {
          nextStage: STAGES.CLARIFY,
          nextCompletedStages: Array.from(
            new Set([...currentCompleted, STAGES.UNDERSTAND])
          ),
          mode: MODES.CLARIFY,
        };
      }

      return {
        nextStage: STAGES.ROOT_CONCERN,
        nextCompletedStages: Array.from(
          new Set([...currentCompleted, STAGES.UNDERSTAND])
        ),
        mode: MODES.REFLECT,
      };
    }

      case STAGES.CLARIFY:
  return {
    nextStage: STAGES.REFLECT,
    nextCompletedStages: Array.from(
      new Set([...currentCompleted, STAGES.CLARIFY])
    ),
    mode: MODES.REFLECT,
  };

      case STAGES.ROOT_CONCERN:
  return {
    nextStage: STAGES.REFLECT,
    nextCompletedStages: Array.from(
      new Set([...currentCompleted, STAGES.ROOT_CONCERN])
    ),
    mode: MODES.REFLECT,
  };

      case STAGES.TEACHING:
        // Transition: TEACHING -> REFLECT
        return {
          nextStage: STAGES.REFLECT,
          nextCompletedStages: Array.from(new Set([...currentCompleted, STAGES.TEACHING])),
          mode: MODES.REFLECT,
        };

      case STAGES.REFLECT:
        // Transition: REFLECT -> ACTION
        return {
          nextStage: STAGES.ACTION,
          nextCompletedStages: Array.from(new Set([...currentCompleted, STAGES.REFLECT])),
          mode: MODES.ACTION,
        };

      case STAGES.ACTION:
        // Transition: ACTION -> REVIEW
        return {
          nextStage: STAGES.REVIEW,
          nextCompletedStages: Array.from(new Set([...currentCompleted, STAGES.ACTION])),
          mode: MODES.REVIEW,
        };

      case STAGES.REVIEW:
        return {
          nextStage: STAGES.REVIEW,
          nextCompletedStages: currentCompleted,
          mode: MODES.REVIEW,
        };

      default:
        throw createError.invalidStage(`Unknown stage: ${currentStage}`);
    }
  }

  /**
   * Validate if a given stage is valid
   */
  static isValidStage(stage) {
    return Object.values(STAGES).includes(stage);
  }
}
