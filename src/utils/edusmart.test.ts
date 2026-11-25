import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTaskStats,
  computeSurveyComparison,
  sanitizeWorkspaceId,
  validateFactCheckInput,
  validateSelfTestInput,
  validateStudyTaskInput,
  validateSurveyAnswers,
  validateThinkEntryInput,
} from './edusmart';

test('calculateTaskStats computes totals and completion percentage accurately', () => {
  assert.deepEqual(calculateTaskStats([]), { total: 0, done: 0, percent: 0 });
  assert.deepEqual(
    calculateTaskStats([{ done: true }, { done: false }, { done: true }]),
    { total: 3, done: 2, percent: 67 }
  );
  assert.deepEqual(
    calculateTaskStats([{ done: true }, { done: true }]),
    { total: 2, done: 2, percent: 100 }
  );
});

test('validateSurveyAnswers validates length, bounds, and average', () => {
  assert.equal(validateSurveyAnswers([1, 2, 3]).valid, false);
  assert.equal(validateSurveyAnswers([1, 2, 3, 4, 5, 6, 3]).valid, false);
  const ok = validateSurveyAnswers([4, 4, 5, 4, 3, 5, 3]);
  assert.equal(ok.valid, true);
  assert.equal(ok.average, 4);
});

test('computeSurveyComparison calculates before/after averages and delta', () => {
  const empty = computeSurveyComparison([]);
  assert.equal(empty.beforeAvg, null);
  assert.equal(empty.afterAvg, null);
  assert.equal(empty.delta, null);

  const compared = computeSurveyComparison([
    { surveyType: 'before', average: 2.5 },
    { surveyType: 'before', average: 3.5 },
    { surveyType: 'after', average: 4.25 },
  ]);
  assert.equal(compared.beforeCount, 2);
  assert.equal(compared.afterCount, 1);
  assert.equal(compared.beforeAvg, 3);
  assert.equal(compared.afterAvg, 4.25);
  assert.equal(compared.delta, 1.25);
});

test('form input validators reject empty required fields and enforce max bounds', () => {
  assert.equal(validateStudyTaskInput({ name: '', subject: 'Toán', goal: 'A', dueDate: '2026-12-01', studySlot: 'Tối' }).valid, false);
  assert.equal(validateStudyTaskInput({ name: 'Ôn bài', subject: 'Toán', goal: 'Nắm vững', dueDate: '2026-12-01', studySlot: 'Tối' }).valid, true);
  assert.equal(validateThinkEntryInput({ subject: 'Toán', question: 'Q', answer: '   ', confidence: 'Rất tự tin' }).valid, false);
  assert.equal(validateFactCheckInput({ content: 'AI', source: '', conclusion: 'OK' }).valid, false);
  assert.equal(validateSelfTestInput({ subject: 'Văn', lesson: '', explain: 'x', apply: 'y', level: 'Đã hiểu rõ' }).valid, false);
});

test('sanitizeWorkspaceId strips unsafe path characters', () => {
  assert.equal(sanitizeWorkspaceId(' 1abc_XYZ-99/../evil '), '1abc_XYZ-99evil');
});
