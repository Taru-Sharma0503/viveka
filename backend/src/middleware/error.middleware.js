import { AppError, ERROR_CODES } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { ZodError } from 'zod';

export const errorMiddleware = (err, req, res, next) => {
  // If response is already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Handled AppError instances
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 2. Zod validation errors
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    let code = ERROR_CODES.INVALID_REQUEST;

    if (issue && issue.path.includes('topic')) {
      code = ERROR_CODES.INVALID_TOPIC;
    } else if (issue && issue.path.includes('message')) {
      code = ERROR_CODES.INVALID_MESSAGE;
    }

    return sendError(res, code, issue ? issue.message : 'Validation failed', 400, err.flatten());
  }

  // 3. Express JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, ERROR_CODES.INVALID_REQUEST, 'Malformed JSON payload in request body', 400);
  }

  // 4. Fallback for unhandled internal exceptions
  console.error('Unhandled server error:', err);
  return sendError(
    res,
    ERROR_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    500
  );
};
