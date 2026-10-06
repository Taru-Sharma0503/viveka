import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('Viveka Backend API Test Suite', async (t) => {
  let createdSessionId = '';
  let createdActionId = '';

  await t.test('API 1: POST /api/v1/sessions - Create Session with valid topic and initialMessage', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({
        topic: 'FAILURE',
        initialMessage: 'I failed my exam and I feel like I am not capable.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.error, null);
    assert.ok(res.body.data.sessionId);
    assert.equal(res.body.data.stage, 'UNDERSTAND');
    assert.equal(res.body.data.topic, 'FAILURE');
    assert.ok(res.body.data.createdAt);

    createdSessionId = res.body.data.sessionId;
  });

  await t.test('API 1: POST /api/v1/sessions - Invalid topic returns INVALID_TOPIC', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({
        topic: 'INVALID_UNKNOWN_TOPIC',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.data, null);
    assert.equal(res.body.error.code, 'INVALID_TOPIC');
  });

  await t.test('API 2: POST /api/v1/sessions/:sessionId/messages - Send Message advances to ROOT_CONCERN', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: 'I am afraid everyone will think I am stupid.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.error, null);

    const data = res.body.data;
    assert.equal(data.stage, 'ROOT_CONCERN');
    assert.equal(data.mode, 'REFLECT');
    assert.ok(data.mentorMessage.id);
    assert.ok(data.mentorMessage.text);
    assert.ok(data.question);
    assert.ok(Array.isArray(data.question.options));
    assert.equal(data.question.allowFreeText, true);
    assert.equal(data.teaching, null);
    assert.equal(data.reflection, null);
    assert.deepEqual(data.actions, []);
    assert.equal(data.journey.currentStage, 'ROOT_CONCERN');
    assert.ok(data.journey.completedStages.includes('UNDERSTAND'));
    assert.ok(data.journey.completedStages.includes('CLARIFY'));
  });

  await t.test('API 2: POST /api/v1/sessions/:sessionId/messages - Progresses to TEACHING with verified quote', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: 'That I disappointed people and I am not good enough.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;
    assert.equal(data.stage, 'TEACHING');
    assert.equal(data.mode, 'TEACHING');
    assert.ok(data.teaching);
    assert.equal(data.teaching.verified, true);
    assert.ok(data.teaching.quote);
    assert.ok(data.teaching.title);
    assert.ok(data.teaching.work);
  });

  await t.test('API 2: POST /api/v1/sessions/:sessionId/messages - Progresses to REFLECT with documented distinction', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: 'I understand what he means about holding on to the idea.',
      });

    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.stage, 'REFLECT');
    assert.equal(data.mode, 'REFLECT');
    assert.ok(data.reflection);
    assert.ok(data.reflection.explanation);
    assert.ok(data.reflection.question);
    assert.ok(data.teaching);
  });

  await t.test('API 2: POST /api/v1/sessions/:sessionId/messages - Progresses to ACTION with autonomous options', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: 'I treated one failed exam as if it proved I have no talent.',
      });

    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.stage, 'ACTION');
    assert.equal(data.mode, 'ACTION');
    assert.ok(Array.isArray(data.actions));
    assert.ok(data.actions.length > 0);
    assert.ok(data.actions[0].id);
    assert.ok(data.actions[0].text);
    assert.ok(typeof data.actions[0].estimatedMinutes === 'number');
  });

  await t.test('API 2: Safety Gate - Trigger crisis keywords returns HUMAN_SUPPORT', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: 'I feel like I want to die and end my life.',
      });

    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.mode, 'HUMAN_SUPPORT');
    assert.ok(data.mentorMessage.text.includes('human support'));
    assert.ok(data.question.options.some((opt) => opt.includes('Tele-MANAS') || opt.includes('AASRA')));
  });

  await t.test('API 2: Validation - Empty message returns INVALID_MESSAGE', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/messages`)
      .send({
        message: '',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_MESSAGE');
  });

  await t.test('API 3: GET /api/v1/sessions/:sessionId - Get Session', async () => {
    const res = await request(app).get(`/api/v1/sessions/${createdSessionId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sessionId, createdSessionId);
    assert.equal(res.body.data.topic, 'FAILURE');
    assert.ok(Array.isArray(res.body.data.messages));
    assert.ok(res.body.data.messages.length > 0);
  });

  await t.test('API 3: GET /api/v1/sessions/:sessionId - Non-existent session returns SESSION_NOT_FOUND', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/api/v1/sessions/${nonExistentId}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SESSION_NOT_FOUND');
  });

  await t.test('API 4: GET /api/v1/passages/:passageId - Get verified passage', async () => {
    const res = await request(app).get('/api/v1/passages/passage_023');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.passageId, 'passage_023');
    assert.ok(res.body.data.exactText);
    assert.equal(res.body.data.title, 'Complete Works of Swami Vivekananda');
    assert.equal(res.body.data.author, 'Swami Vivekananda');
    assert.ok(res.body.data.work);
  });

  await t.test('API 4: GET /api/v1/passages/:passageId - Non-existent passage returns PASSAGE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/passages/passage_nonexistent');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'PASSAGE_NOT_FOUND');
  });

  await t.test('API 5: POST /api/v1/sessions/:sessionId/actions - Save Action', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${createdSessionId}/actions`)
      .send({
        actionText: 'Analyse the mistakes from my exam.',
        reviewDue: '2026-10-07T18:00:00.000Z',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.actionId);
    assert.equal(res.body.data.actionText, 'Analyse the mistakes from my exam.');
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.reviewDue, '2026-10-07T18:00:00.000Z');

    createdActionId = res.body.data.actionId;
  });

  await t.test('API 6: POST /api/v1/actions/:actionId/review - Review Action', async () => {
    const res = await request(app)
      .post(`/api/v1/actions/${createdActionId}/review`)
      .send({
        status: 'COMPLETED',
        note: 'I realised most of my mistakes were from rushing.',
        helpfulnessRating: 5,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reviewId);
    assert.equal(res.body.data.actionId, createdActionId);
    assert.equal(res.body.data.status, 'COMPLETED');
    assert.ok(res.body.data.nextStep);
    assert.ok(res.body.data.nextStep.text);
  });

  await t.test('API 6: POST /api/v1/actions/:actionId/review - Non-existent action returns ACTION_NOT_FOUND', async () => {
    const res = await request(app)
      .post('/api/v1/actions/nonexistent_action_id/review')
      .send({
        status: 'COMPLETED',
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'ACTION_NOT_FOUND');
  });

  await t.test('API 7: DELETE /api/v1/sessions/:sessionId - Delete Session', async () => {
    const res = await request(app).delete(`/api/v1/sessions/${createdSessionId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deleted, true);

    // Verify subsequent lookup fails with 404 SESSION_NOT_FOUND
    const verifyRes = await request(app).get(`/api/v1/sessions/${createdSessionId}`);
    assert.equal(verifyRes.status, 404);
    assert.equal(verifyRes.body.error.code, 'SESSION_NOT_FOUND');
  });
});
