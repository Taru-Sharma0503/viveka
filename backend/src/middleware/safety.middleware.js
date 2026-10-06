import { SafetyService } from '../services/safety.service.js';

export const safetyMiddleware = (req, res, next) => {
  const textToCheck = req.body?.message || req.body?.initialMessage || '';
  const evaluation = SafetyService.evaluate(textToCheck);

  if (evaluation.isCrisis) {
    req.isSafetyCrisis = true;
  }
  next();
};
