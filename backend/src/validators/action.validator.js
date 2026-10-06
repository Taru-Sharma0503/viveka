import { z } from 'zod';
import { ACTION_STATUSES } from '../state/stages.js';
import { createError } from '../utils/errors.js';

export const saveActionSchema = z.object({
  actionText: z
    .string({
      required_error: 'actionText is required',
      invalid_type_error: 'actionText must be a string',
    })
    .trim()
    .min(1, 'actionText must be at least 1 character long')
    .max(2000, 'actionText must not exceed 2000 characters'),
  reviewDue: z
    .string()
    .datetime({ message: 'reviewDue must be a valid ISO-8601 string' })
    .nullable()
    .optional(),
});

export const reviewActionSchema = z.object({
  status: z.enum(ACTION_STATUSES, {
    errorMap: () => ({
      message: `status must be one of: ${ACTION_STATUSES.join(', ')}`,
    }),
  }),
  note: z
    .string({
      invalid_type_error: 'note must be a string',
    })
    .max(2000, 'note must not exceed 2000 characters')
    .nullable()
    .optional(),
  helpfulnessRating: z
    .number({
      invalid_type_error: 'helpfulnessRating must be a number',
    })
    .int('helpfulnessRating must be an integer')
    .min(1, 'helpfulnessRating must be between 1 and 5')
    .max(5, 'helpfulnessRating must be between 1 and 5')
    .nullable()
    .optional(),
});

export const actionIdParamSchema = z.object({
  actionId: z.string().min(1, 'actionId is required'),
});

export const validateSaveAction = (req, res, next) => {
  const result = saveActionSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return next(createError.invalidRequest(issue.message, result.error.flatten()));
  }
  req.validatedBody = result.data;
  next();
};

export const validateReviewAction = (req, res, next) => {
  const result = reviewActionSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return next(createError.invalidRequest(issue.message, result.error.flatten()));
  }
  req.validatedBody = result.data;
  next();
};

export const validateActionIdParam = (req, res, next) => {
  const result = actionIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return next(createError.invalidRequest('Invalid actionId format', result.error.flatten()));
  }
  next();
};
