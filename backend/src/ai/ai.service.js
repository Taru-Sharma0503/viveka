import { v4 as uuidv4 } from 'uuid';
import { STAGES, MODES } from '../state/stages.js';
import { RagService } from './rag.service.js';
import { QuoteValidator } from './quote-validator.js';
import { mentorResponseSchema } from './output-schema.js';
import { createError } from '../utils/errors.js';
import { callAiLayer } from './ai-bridge.js';

export class AiService {
  /**
   * Orchestrates the mentor response generation for a given stage.
   *
   * Priority:
   *   1. /ai layer (Gemini primary → Groq fallback → RAG + Qdrant)
   *   2. Local fallback (hardcoded stage-based responses)
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
    // --- Attempt 1: delegate to /ai layer ---
    try {
      const aiResult = await callAiLayer({
        stage,
        mode,
        topic,
        userMessage,
        history,
        completedStages,
        contextData,
      });

      if (aiResult) {
        const validated = mentorResponseSchema.safeParse(aiResult);

        if (validated.success) {
          return validated.data;
        }

        console.warn(
          '[AiService] /ai layer response failed schema validation, using fallback:',
          validated.error.flatten()
        );
      }
    } catch (err) {
      console.warn(
        '[AiService] /ai layer error, falling back to local handler:',
        err.message
      );
    }

    // --- Attempt 2: local stage-based fallback ---
    return AiService._localFallback({
      stage,
      mode,
      topic,
      userMessage,
      contextData,
      completedStages,
    });
  }

  /**
   * Local fallback: hardcoded stage responses using backend DB passages.
   * Used when the /ai layer is unavailable or returns an invalid response.
   */
  static async _localFallback({
    stage,
    mode,
    topic,
    userMessage,
    contextData,
    completedStages,
  }) {
    let mentorMessageText = '';
    let question = null;
    let teaching = null;
    let reflection = null;
    let actions = [];

    const effectiveTopic = (topic || 'FAILURE').toUpperCase();
    const kind = contextData.kind || 'trouble';

    switch (stage) {
      case STAGES.CLARIFY: {
        mentorMessageText =
          'Let us untangle this before deciding what to do. What are you actually trying to choose, understand, or decide?';

        question = {
          text: mentorMessageText,
          options: [
            'I am choosing between different options',
            'I know what I want, but something is holding me back',
            'I am not sure what matters most to me',
            'Something else',
          ],
          allowFreeText: true,
        };

        break;
      }

      case STAGES.ROOT_CONCERN: {
        mentorMessageText =
          'Let us stay with what is happening before trying to fix it. What part of this situation is affecting you most deeply?';

        question = {
          text: mentorMessageText,
          options: [
            'What happened is still bothering me',
            'I am afraid of what this means about me',
            'I keep thinking about how others see me',
            'Something else',
          ],
          allowFreeText: true,
        };

        break;
      }

      case STAGES.TEACHING: {
        const passageId =
          contextData.passageId ||
          (await RagService.selectBestPassageId({
            query: userMessage,
            topic: effectiveTopic,
          }));

        try {
          teaching = await QuoteValidator.validateAndBuildTeaching(passageId);
        } catch (err) {
          throw createError.quoteValidationFailed(err.message);
        }

        mentorMessageText = `Here is a perspective from Swami Vivekananda that may speak to what you are exploring: "${teaching.quote}"`;

        question = {
          text: 'What does this teaching bring up for you?',
          options: [
            'I see something differently now',
            'It connects to something I am experiencing',
            'I am not sure what it means for me yet',
            'Something else',
          ],
          allowFreeText: true,
        };

        break;
      }

      case STAGES.REFLECT: {
        if (kind === 'teaching') {
          const passageId = contextData.passageId || 'passage_023';

          try {
            teaching =
              await QuoteValidator.validateAndBuildTeaching(passageId);
          } catch (err) {
            teaching =
              await QuoteValidator.validateAndBuildTeaching('passage_023');
          }

          reflection = {
            explanation:
              'Take a moment to put the teaching into your own words. What do you think it is really saying?',
            question:
              'In your own words, what do you think this teaching means?',
          };

          mentorMessageText = reflection.explanation;

          question = {
            text: reflection.question,
            options: [
              'I understand the main idea',
              'It challenges something I believed before',
              'I am still trying to understand it',
              'Something else',
            ],
            allowFreeText: true,
          };

          break;
        }

        if (kind === 'clarity') {
          reflection = {
            explanation:
              'Clarity does not always mean finding a perfect answer. It can mean seeing what matters, what you are willing to accept, and what you are not.',
            question:
              'After looking at this more closely, what matters most in the decision you are facing?',
          };

          mentorMessageText = reflection.explanation;

          question = {
            text: reflection.question,
            options: [
              'What I genuinely want',
              'What I am willing to give up',
              'What I have been afraid to choose',
              'Something else',
            ],
            allowFreeText: true,
          };

          break;
        }

        reflection = {
          explanation:
            'Understanding a difficult experience does not mean judging yourself for it. It means noticing what the experience is showing you.',
          question:
            'Looking at what happened now, what do you think this experience is showing you about yourself?',
        };

        mentorMessageText = reflection.explanation;

        question = {
          text: reflection.question,
          options: [
            'I need to be kinder to myself',
            'I can see a pattern in how I respond',
            'I understand what was really hurting me',
            'Something else',
          ],
          allowFreeText: true,
        };

        break;
      }

      case STAGES.ACTION: {
        if (kind === 'clarity') {
          mentorMessageText =
            'You do not need to solve everything at once. Choose one small step that will make the decision clearer.';

          actions = [
            {
              id: 'action_option_1',
              text: 'Write down the two options and one important tradeoff for each.',
              estimatedMinutes: 10,
            },
            {
              id: 'action_option_2',
              text: 'Spend 15 minutes identifying what matters most before deciding.',
              estimatedMinutes: 15,
            },
            {
              id: 'action_option_3',
              text: 'Talk to someone you trust and ask for a perspective, not a decision.',
              estimatedMinutes: 15,
            },
          ];

          question = null;
          break;
        }

        if (kind === 'teaching') {
          mentorMessageText =
            'A teaching becomes meaningful when it changes something you actually do. Choose one small way to apply what you explored today.';

          actions = [
            {
              id: 'action_option_1',
              text: 'Write one situation where you can apply this teaching.',
              estimatedMinutes: 10,
            },
            {
              id: 'action_option_2',
              text: 'Practice the principle once in a situation you face today.',
              estimatedMinutes: 15,
            },
            {
              id: 'action_option_3',
              text: 'Write down one sentence about what you want to remember from this teaching.',
              estimatedMinutes: 5,
            },
          ];

          question = null;
          break;
        }

        mentorMessageText =
          'Transformation begins with small, deliberate actions. Choose one concrete step to take today:';

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
        mentorMessageText =
          'You have reflected deeply on this challenge. What insights have solidified for you?';

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
        mentorMessageText =
          'Tell me more about what you are encountering right now.';

        question = {
          text: 'What aspect of this situation feels most pressing?',
          options: [
            'The immediate pressure',
            'The long-term impact',
            'The emotional burden',
          ],
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
  static generateReviewNextStep({
    actionText,
    status,
    note,
    helpfulnessRating,
  }) {
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