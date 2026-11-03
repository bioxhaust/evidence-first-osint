import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, emptyState, sanitizeState, canOpen, grade, caseProgress}
  from '../docs/assets/investigator/state.js';

const caseData = {
  id: 'old-handle',
  evidence: [
    {id: 'profile', requires: ['hub']},
    {id: 'archive', requires: ['profile', 'rules']},
    {id: 'hub', requires: []},
    {id: 'rules', requires: []},
    {id: 'distractor', requires: []},
  ],
  questions: [
    {id: 'match', options: [{id: 'linked'}, {id: 'same-name'}], correct: 'linked',
      requiredEvidence: ['hub', 'profile']},
    {id: 'history', options: [{id: 'bounded'}, {id: 'certain'}], correct: 'bounded',
      requiredEvidence: ['archive', 'rules'], acceptableEvidenceSets: [['archive', 'profile']]},
  ],
};
const cases = [caseData];
const openAll = () => ({opened: ['hub', 'rules', 'profile', 'archive', 'distractor'], notes: '', answers: {}});
const answer = (choice, cited, submitted = true) => ({choice, cited, submitted});

test('blank states have independent case/question data and a separate storage key', () => {
  const a = emptyState(cases), b = emptyState(cases);
  assert.equal(STORAGE_KEY, 'ef-investigator-v1');
  assert.deepEqual(a.cases['old-handle'].answers.match, {choice: '', cited: [], submitted: false});
  a.cases['old-handle'].opened.push('hub');
  a.cases['old-handle'].answers.match.cited.push('hub');
  assert.deepEqual(b.cases['old-handle'].opened, []);
  assert.deepEqual(b.cases['old-handle'].answers.match.cited, []);
  assert.deepEqual(a.cases['old-handle'].answers.history.cited, []);
});

test('opening requires every dependency and allows revisiting known sources', () => {
  const state = emptyState(cases).cases['old-handle'];
  assert.equal(canOpen(caseData, state, 'hub'), true);
  assert.equal(canOpen(caseData, state, 'profile'), false);
  state.opened.push('hub');
  assert.equal(canOpen(caseData, state, 'profile'), true);
  assert.equal(canOpen(caseData, state, 'hub'), true);
  state.opened.push('profile');
  assert.equal(canOpen(caseData, state, 'archive'), false);
  state.opened.push('rules');
  assert.equal(canOpen(caseData, state, 'archive'), true);
  assert.equal(canOpen(caseData, state, 'unknown'), false);
});

test('restore calculates reachable chains regardless of order, dropping missing and cyclic prerequisites', () => {
  const extra = {...caseData, evidence: [...caseData.evidence,
    {id: 'cycle-a', requires: ['cycle-b']}, {id: 'cycle-b', requires: ['cycle-a']}]};
  const raw = {version: 1, cases: {'old-handle': {
    opened: ['archive', 'profile', 'hub', 'cycle-a', 'cycle-b', 'unknown', 'hub'],
  }}};
  const state = sanitizeState(raw, [extra]).cases['old-handle'];
  assert.deepEqual(state.opened, ['profile', 'hub']);
  assert.equal(canOpen(extra, {opened: ['profile']}, 'archive'), false);
  raw.cases['old-handle'].opened.push('rules');
  assert.deepEqual(sanitizeState(raw, [extra]).cases['old-handle'].opened, ['archive', 'profile', 'hub', 'rules']);
});

test('correct options need a submitted exact evidence set, not a blanket list or unread citations', () => {
  const state = openAll();
  state.answers.match = answer('linked', ['profile', 'hub'], false);
  assert.deepEqual(grade(caseData, state, 'match'),
    {correct: false, choiceCorrect: true, evidenceCorrect: true, ready: false});
  state.answers.match.submitted = true;
  assert.equal(grade(caseData, state, 'match').correct, true);
  state.answers.match.cited.push('distractor');
  assert.equal(grade(caseData, state, 'match').evidenceCorrect, false);
  state.answers.match = answer('same-name', ['hub', 'profile']);
  assert.deepEqual(grade(caseData, state, 'match'),
    {correct: false, choiceCorrect: false, evidenceCorrect: true, ready: true});
  state.opened = ['hub'];
  state.answers.match = answer('linked', ['hub', 'profile']);
  assert.equal(grade(caseData, state, 'match').evidenceCorrect, false);
});

test('accepted alternative evidence combinations work but an incomplete subset does not', () => {
  const state = openAll();
  for (const cited of [['archive', 'rules'], ['profile', 'archive'], ['archive', 'profile', 'archive']]) {
    state.answers.history = answer('bounded', cited);
    assert.equal(grade(caseData, state, 'history').correct, true);
  }
  state.answers.history.cited = ['archive'];
  assert.equal(grade(caseData, state, 'history').correct, false);
});

test('sanitize drops unknown data and inherited properties, limits notes, and does not mutate inputs', () => {
  const raw = JSON.parse('{"version":1,"complete":true,"cases":{"__proto__":{"polluted":true},"other":{"opened":["hub"]},"old-handle":{"opened":["hub","profile","unknown"],"notes":"short","answers":{"__proto__":{"choice":"linked"},"unknown":{"submitted":true},"match":{"choice":"linked","cited":["hub","profile","profile","archive","__proto__"],"submitted":true},"history":{"choice":"bad-choice","cited":["hub"],"submitted":true}},"complete":true}}}');
  raw.cases['old-handle'].notes = 'x'.repeat(7000);
  const before = structuredClone(raw);
  const state = sanitizeState(raw, cases);
  assert.deepEqual(Object.keys(state.cases), ['old-handle']);
  assert.deepEqual(Object.keys(state.cases['old-handle'].answers), ['match', 'history']);
  assert.equal(state.cases['old-handle'].notes.length, 6000);
  assert.deepEqual(state.cases['old-handle'].answers.match.cited, ['hub', 'profile']);
  assert.deepEqual(state.cases['old-handle'].answers.history, {choice: '', cited: ['hub'], submitted: false});
  assert.equal({}.polluted, undefined);
  assert.deepEqual(raw, before);
  state.cases['old-handle'].answers.match.cited.push('rules');
  assert.deepEqual(raw, before);
  const inherited = Object.create({version: 1, cases: raw.cases});
  assert.throws(() => sanitizeState(inherited, cases));
  assert.deepEqual(sanitizeState({version: 1, cases: Object.create(raw.cases)}, cases), emptyState(cases));
});

test('unsupported roots throw while partial valid saves safely receive blank defaults', () => {
  for (const value of [null, [], 'text', 1, {}, {version: 2}]) {
    assert.throws(() => sanitizeState(value, cases));
  }
  for (const value of [{version: 1}, {version: 1, cases: []}, {version: 1, cases: {}}]) {
    assert.deepEqual(sanitizeState(value, cases), emptyState(cases));
  }
});

test('progress is derived from graded submissions and updating a draft can revoke completion', () => {
  const state = openAll();
  state.complete = true;
  assert.deepEqual(caseProgress(caseData, state), {opened: 5, correct: 0, total: 2, complete: false});
  state.answers.match = answer('linked', ['hub', 'profile']);
  state.answers.history = answer('bounded', ['archive', 'rules']);
  assert.deepEqual(caseProgress(caseData, state), {opened: 5, correct: 2, total: 2, complete: true});
  state.answers.history.submitted = false;
  assert.deepEqual(caseProgress(caseData, state), {opened: 5, correct: 1, total: 2, complete: false});
  assert.deepEqual(grade(caseData, state, 'unknown'),
    {correct: false, choiceCorrect: false, evidenceCorrect: false, ready: false});
  assert.equal(caseProgress({id: 'empty', evidence: [], questions: []}, {}).complete, false);
});
