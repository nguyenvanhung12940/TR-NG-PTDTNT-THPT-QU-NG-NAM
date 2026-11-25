import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('firestore.rules includes rules_version 2 and default deny catch-all', () => {
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match\s*\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('firestore.rules enforces email_verified, valid IDs, PII isolation, and no get/exists in allow list', () => {
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /function\s+isValidId\(id\)/);
  assert.match(rules, /match\s+\/private\/\{docId\}/);
  const listLines = rules
    .split('\n')
    .filter((line) => line.includes('allow list:'));
  assert.ok(listLines.length >= 6);
  for (const line of listLines) {
    assert.equal(line.includes('isAdmin()'), false, `allow list must not call get/exists helper: ${line}`);
  }
});

test('firestore.rules blocks self-approval of teacherApproved and requires validation helpers on update', () => {
  assert.match(rules, /incoming\(\)\.teacherApproved\s*==\s*false/);
  assert.match(rules, /incoming\(\)\.teacherApproved\s*==\s*existing\(\)\.teacherApproved/);
  assert.match(rules, /isValidUserProfile\(incoming\(\)\)/);
  assert.match(rules, /isValidStudyTask\(incoming\(\)\)/);
});
