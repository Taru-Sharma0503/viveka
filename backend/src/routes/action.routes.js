import { Router } from 'express';
import { ActionController } from '../controllers/action.controller.js';
import {
  validateActionIdParam,
  validateReviewAction,
} from '../validators/action.validator.js';

const router = Router();

// API 6 — Review Action
router.post(
  '/:actionId/review',
  validateActionIdParam,
  validateReviewAction,
  ActionController.reviewAction
);

export default router;
