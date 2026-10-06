import { Router } from 'express';
import { PassageController } from '../controllers/passage.controller.js';

const router = Router();

// API 4 — Get Passage
router.get('/:passageId', PassageController.getPassage);

export default router;
