export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TOPIC: 'INVALID_TOPIC',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  PASSAGE_NOT_FOUND: 'PASSAGE_NOT_FOUND',
  ACTION_NOT_FOUND: 'ACTION_NOT_FOUND',
  INVALID_STAGE: 'INVALID_STAGE',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  QUOTE_VALIDATION_FAILED: 'QUOTE_VALIDATION_FAILED',
  NO_RELEVANT_SOURCE: 'NO_RELEVANT_SOURCE',
  SAFETY_REDIRECT: 'SAFETY_REDIRECT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = {
  invalidRequest: (message = 'Invalid request', details = null) =>
    new AppError(ERROR_CODES.INVALID_REQUEST, message, 400, details),

  invalidTopic: (message = 'Invalid topic specified', details = null) =>
    new AppError(ERROR_CODES.INVALID_TOPIC, message, 400, details),

  invalidMessage: (message = 'Invalid message content', details = null) =>
    new AppError(ERROR_CODES.INVALID_MESSAGE, message, 400, details),

  sessionNotFound: (sessionId) =>
    new AppError(
      ERROR_CODES.SESSION_NOT_FOUND,
      `Session with id ${sessionId} not found`,
      404
    ),

  passageNotFound: (passageId) =>
    new AppError(
      ERROR_CODES.PASSAGE_NOT_FOUND,
      `Passage with id ${passageId} not found`,
      404
    ),

  actionNotFound: (actionId) =>
    new AppError(
      ERROR_CODES.ACTION_NOT_FOUND,
      `Action with id ${actionId} not found`,
      404
    ),

  invalidStage: (message = 'Invalid state machine transition or stage', details = null) =>
    new AppError(ERROR_CODES.INVALID_STAGE, message, 400, details),

  aiServiceError: (message = 'AI service failed to generate response', details = null) =>
    new AppError(ERROR_CODES.AI_SERVICE_ERROR, message, 502, details),

  aiInvalidResponse: (message = 'AI generated response failed validation', details = null) =>
    new AppError(ERROR_CODES.AI_INVALID_RESPONSE, message, 502, details),

  quoteValidationFailed: (message = 'Quote verification failed against canonical corpus', details = null) =>
    new AppError(ERROR_CODES.QUOTE_VALIDATION_FAILED, message, 422, details),

  noRelevantSource: (message = 'No verified passage found for the given reflection context', details = null) =>
    new AppError(ERROR_CODES.NO_RELEVANT_SOURCE, message, 404, details),

  safetyRedirect: (message = 'Safety trigger: Immediate human support recommended', details = null) =>
    new AppError(ERROR_CODES.SAFETY_REDIRECT, message, 400, details),

  databaseError: (message = 'Database operation failed', details = null) =>
    new AppError(ERROR_CODES.DATABASE_ERROR, message, 500, details),

  internalError: (message = 'Internal server error', details = null) =>
    new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500, details),
};
