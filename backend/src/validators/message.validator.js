import { z } from 'zod';
import { createError } from '../utils/errors.js';

export const sendMessageSchema = z.object({
  message: z
    .string({
      required_error: 'message is required',
      invalid_type_error: 'message must be a string',
    })
    .trim()
    .min(1, 'message must be at least 1 character long')
    .max(2000, 'message must not exceed 2000 characters'),
});

export const validateSendMessage = (req, res, next) => {
  const result = sendMessageSchema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return next(createError.invalidMessage(issue.message, result.error.flatten()));
  }
  req.validatedBody = result.data;
  next();
};
