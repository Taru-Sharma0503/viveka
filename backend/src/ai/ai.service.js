import { v4 as uuidv4 } from 'uuid';
import { STAGES, MODES } from '../state/stages.js';
import { RagService } from './rag.service.js';
import { QuoteValidator } from './quote-validator.js';
import { mentorResponseSchema } from './output-schema.js';
import { createError } from '../utils/errors.js';

export class AiService {
  /**
   * Orchestrates the mentor response generation for a given stage
   */
  static async generateMentorResponse({
    stage,
    mode,
    topic,
    userMessage,
    history = [],
    completedStages = [],
    contextData = {},
  }) {
    let mentorMessageText = '';
    let question = null;
    let teaching = null;
    let reflection = null;
    let actions = [];

    const effectiveTopic = (topic || 'FAILURE').toUpperCase();

    switch (stage) {
      case STAGES.ROOT_CONCERN: {
        mentorMessageText =
          effectiveTopic === 'FAILURE'
            ? 'Before we decide what to do, let us understand something. What would being judged by others mean about you?'
            : effectiveTopic === 'FEAR'
            ? 'Beneath this hesitation lies a deeper question. What is the fundamental outcome you are most afraid of encountering?'
            : 'Before taking action, let us understand the underlying feeling. What does this situation touch most deeply in you?';

        question = {
          text: mentorMessageText,
          options: [
            'That I am not intelligent enough',
            'That I disappointed people',
            'That I am not good enough',
            'Something else',
          ],
          allowFreeText: true,
        };
        break;
      }

      case STAGES.TEACHING: {
        const passageId = contextData.passageId || (await RagService.selectBestPassageId({
          query: userMessage,
          topic: effectiveTopic,
        }));

        try {
          teaching = await QuoteValidator.validateAndBuildTeaching(passageId);
        } catch (err) {
          throw createError.quoteValidationFailed(err.message);
        }

        mentorMessageText = `Consider this perspective from Swami Vivekananda regarding strength and persistence: "${teaching.quote}"`;
        question = null;
        break;
      }

      case STAGES.REFLECT: {
        const passageId = contextData.passageId || 'passage_023';
        try {
          teaching = await QuoteValidator.validateAndBuildTeaching(passageId);
        } catch (err) {
          // Fallback to passage_023 if specified passage not found
          teaching = await QuoteValidator.validateAndBuildTeaching('passage_023');
        }

        reflection = {
          explanation:
            effectiveTopic === 'FAILURE'
              ? 'This teaching can be understood here as an invitation to separate your worth from one particular outcome.'
              : 'This teaching invites you to look inward for steadfastness rather than relying on external circumstances.',
          question:
            effectiveTopic === 'FAILURE'
              ? 'Where in your situation are you treating one result as a judgment of your ability?'
              : 'Where in this challenge can you reclaim your inner calm and sovereignty?',
        };

        mentorMessageText = reflection.explanation;
        question = {
          text: reflection.question,
          options: [
            'I assumed this single event defines my future',
            'I forgot that skills develop through struggle',
            'I focused too much on other people’s opinions',
            'Something else',
          ],
          allowFreeText: true,
        };
        break;
      }

      case STAGES.ACTION: {
        mentorMessageText = 'Transformation begins with small, deliberate actions. Choose one concrete step to take today:';
        actions = [
          {
            id: 'action_option_1',
            text: 'Spend 20 minutes analysing the questions you got wrong.',
            estimatedMinutes: 20,
          },
          {
            id: 'action_option_2',
            text: 'Make a new study plan focused on the areas where you stumbled.',
            estimatedMinutes: 15,
          },
          {
            id: 'action_option_3',
            text: 'Write down what you learned from this experience.',
            estimatedMinutes: 10,
          },
        ];
        question = null;
        break;
      }

      case STAGES.REVIEW: {
        mentorMessageText = 'You have reflected deeply on this challenge. What insights have solidified for you?';
        question = {
          text: 'How do you feel about moving forward from here?',
          options: [
            'Clearer and ready to act',
            'Still uncertain, but calmer',
            'I need more time to process',
          ],
          allowFreeText: true,
        };
        break;
      }

      default: {
        mentorMessageText = 'Tell me more about what you are encountering right now.';
        question = {
          text: 'What aspect of this situation feels most pressing?',
          options: ['The immediate pressure', 'The long-term impact', 'The emotional burden'],
          allowFreeText: true,
        };
      }
    }

    const responsePayload = {
      stage,
      mode: mode || MODES.REFLECT,
      mentorMessage: {
        id: uuidv4(),
        text: mentorMessageText,
      },
      question,
      teaching,
      reflection,
      actions,
      journey: {
        currentStage: stage,
        completedStages,
      },
    };

    const validated = mentorResponseSchema.safeParse(responsePayload);
    if (!validated.success) {
      throw createError.aiInvalidResponse(
        'Generated mentor response does not match canonical schema',
        validated.error.flatten()
      );
    }

    return validated.data;
  }

  /**
   * Generates reflective next step for action review
   */
  static generateReviewNextStep({ actionText, status, note, helpfulnessRating }) {
    if (status === 'COMPLETED') {
      if (note && note.toLowerCase().includes('rushing')) {
        return {
          text: 'You have identified something useful: the problem may not have been ability, but rushing. Would you like to explore how to handle that next time?',
        };
      }
      return {
        text: 'Completing this step marks real progress. Notice how engaging directly with the challenge shifts your relationship to it. Would you like to set the next milestone?',
      };
    }

    if (status === 'PARTIALLY_COMPLETED') {
      return {
        text: 'Even partial action breaks inertia. What small adjustment would help you carry it forward with ease?',
      };
    }

    return {
      text: 'Acknowledging where things stand is honest and valuable. Would you like to redefine this action so it feels more accessible?',
    };
  }
}
