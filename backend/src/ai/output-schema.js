import { z } from 'zod';
import { STAGE_ORDER, MODES } from '../state/stages.js';

export const actionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  estimatedMinutes: z.number().nullable(),
});

export const teachingSchema = z.object({
  passageId: z.string(),
  quote: z.string(),
  title: z.string(),
  work: z.string(),
  section: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  verified: z.boolean(),
});

export const reflectionSchema = z.object({
  explanation: z.string(),
  question: z.string(),
});

export const questionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()),
  allowFreeText: z.boolean(),
});

export const mentorResponseSchema = z.object({
  stage: z.string(),
  mode: z.enum([
    MODES.CLARIFY,
    MODES.REFLECT,
    MODES.TEACHING,
    MODES.ACTION,
    MODES.REVIEW,
    MODES.NO_SOURCE,
    MODES.HUMAN_SUPPORT,
  ]),
  mentorMessage: z.object({
    id: z.string(),
    text: z.string(),
  }),
  question: questionSchema.nullable(),
  teaching: teachingSchema.nullable(),
  reflection: reflectionSchema.nullable(),
  actions: z.array(actionOptionSchema),
  journey: z.object({
    currentStage: z.string(),
    completedStages: z.array(z.string()),
  }),
});
