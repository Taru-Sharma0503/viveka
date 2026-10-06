import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { ActionController } from '../controllers/action.controller.js';
import {
  validateCreateSession,
  validateSessionIdParam,
} from '../validators/session.validator.js';
import { validateSendMessage } from '../validators/message.validator.js';
import { validateSaveAction } from '../validators/action.validator.js';
import { safetyMiddleware } from '../middleware/safety.middleware.js';

const router = Router();

// API 1 — Create Session
router.post('/', validateCreateSession, safetyMiddleware, SessionController.createSession);

// API 2 — Send Message
router.post(
  '/:sessionId/messages',
  validateSessionIdParam,
  validateSendMessage,
  safetyMiddleware,
  SessionController.sendMessage
);

// API 3 — Get Session
router.get('/:sessionId', validateSessionIdParam, SessionController.getSession);

// API 5 — Save Action
router.post(
  '/:sessionId/actions',
  validateSessionIdParam,
  validateSaveAction,
  ActionController.saveAction
);

// API 7 — Delete Session
router.delete('/:sessionId', validateSessionIdParam, SessionController.deleteSession);

export default router;
