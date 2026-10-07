import { z } from 'zod';
import { TOPICS } from '../state/stages.js';
import { createError } from '../utils/errors.js';

export const createSessionSchema = z.object({
  topic: z
    .enum(TOPICS, {
      errorMap: () => ({ message: `Topic must be one of: ${TOPICS.join(', ')}` }),
    })
    .nullable()
    .optional(),

  kind: z
    .enum(['trouble', 'clarity', 'teaching'], {
      errorMap: () => ({
        message: 'Kind must be trouble, clarity, or teaching',
      }),
    })
    .optional(),

  initialMessage: z
    .string({
      invalid_type_error: 'initialMessage must be a string',
    })
    .max(2000, 'initialMessage must not exceed 2000 characters')
    .nullable()
    .optional(),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID' }),
});

export const validateCreateSession = (req, res, next) => {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    if (issue && issue.path.includes('topic')) {
      return next(createError.invalidTopic(issue.message, result.error.flatten()));
    }
    return next(createError.invalidRequest(issue.message, result.error.flatten()));
  }
  req.validatedBody = result.data;
  next();
};

export const validateSessionIdParam = (req, res, next) => {
  const result = sessionIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return next(createError.invalidRequest('Invalid sessionId format: must be a UUID', result.error.flatten()));
  }
  next();
};
