// MIT. Pure state helpers for the original synthetic investigation exercises.
// No storage, network, DOM operations or automatic grading of free-text notes.

export const STORAGE_KEY = 'ef-investigator-v1';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => isRecord(value) && Object.hasOwn(value, key) ? value[key] : undefined;
const safeId = id => typeof id === 'string' && id.length > 0 && id.length <= 200
  && !['__proto__', 'prototype', 'constructor'].includes(id);
const evidenceOf = caseData => (Array.isArray(caseData?.evidence) ? caseData.evidence : [])
  .filter(item => safeId(item?.id));
const questionsOf = caseData => (Array.isArray(caseData?.questions) ? caseData.questions : [])
  .filter(item => safeId(item?.id));

function uniqueIds(value, allowed) {
  return [...new Set((Array.isArray(value) ? value : []).filter(id => safeId(id) && allowed.has(id)))];
}

// An imported dependent source cannot unlock itself. Only roots and requested
// sources whose complete dependency chains were also requested are retained.
// Sources in a cycle with no reachable root stay closed. Discovery order is kept.
function reachableOpened(caseData, value) {
  const evidence = evidenceOf(caseData);
  const requested = uniqueIds(value, new Set(evidence.map(item => item.id)));
  const candidates = new Set(requested), reached = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of evidence) {
      const requires = Array.isArray(item.requires) ? item.requires : [];
      if (candidates.has(item.id) && !reached.has(item.id)
          && requires.every(id => reached.has(id))) {
        reached.add(item.id);
        changed = true;
      }
    }
  }
  return requested.filter(id => reached.has(id));
}

function cleanCase(caseData, value) {
  const opened = reachableOpened(caseData, own(value, 'opened'));
  const openedIds = new Set(opened), answers = {};
  const rawAnswers = own(value, 'answers');
  for (const question of questionsOf(caseData)) {
    const raw = own(rawAnswers, question.id);
    const choices = new Set((Array.isArray(question.options) ? question.options : [])
      .map(option => option?.id).filter(safeId));
    const candidate = own(raw, 'choice');
    const choice = choices.has(candidate) ? candidate : '';
    answers[question.id] = {
      choice,
      cited: uniqueIds(own(raw, 'cited'), openedIds),
      submitted: own(raw, 'submitted') === true && choice !== '',
    };
  }
  const notes = own(value, 'notes');
  return {opened, notes: typeof notes === 'string' ? notes.slice(0, 6000) : '', answers};
}

/** Return fresh, independent blank entries for all known cases and questions. */
export function emptyState(cases) {
  const result = {version: 1, cases: {}};
  for (const caseData of Array.isArray(cases) ? cases : []) {
    if (safeId(caseData?.id)) result.cases[caseData.id] = cleanCase(caseData, null);
  }
  return result;
}

/**
 * Validate a parsed persisted state. Unsupported/non-object roots throw so the
 * caller can distinguish a broken save from a new learner. Partial valid roots
 * receive blank defaults; unknown fields and inherited properties are ignored.
 * Every returned array/object is fresh. Notes are kept as plain text, capped at
 * 6000 UTF-16 code units; the UI must render them with textContent/value.
 */
export function sanitizeState(value, cases) {
  if (!isRecord(value) || own(value, 'version') !== 1) {
    throw new Error('Неподдерживаемый формат сохранённого расследования.');
  }
  const result = emptyState(cases), rawCases = own(value, 'cases');
  for (const caseData of Array.isArray(cases) ? cases : []) {
    if (safeId(caseData?.id)) result.cases[caseData.id] = cleanCase(caseData, own(rawCases, caseData.id));
  }
  return result;
}

/** Sources may be revisited. Unknown IDs and unmet dependency chains are closed. */
export function canOpen(caseData, caseState, evidenceId) {
  const item = evidenceOf(caseData).find(source => source.id === evidenceId);
  if (!item) return false;
  const opened = new Set(reachableOpened(caseData, own(caseState, 'opened')));
  return (Array.isArray(item.requires) ? item.requires : []).every(id => opened.has(id));
}

/**
 * Grade only the selected option and minimal citation set, never the notes.
 * requiredEvidence is accepted together with any listed alternative sets.
 * Choice/evidence flags describe the current draft; correct requires submission.
 */
export function grade(caseData, caseState, questionId) {
  const question = questionsOf(caseData).find(item => item.id === questionId);
  if (!question) return {correct: false, choiceCorrect: false, evidenceCorrect: false, ready: false};
  const answer = cleanCase(caseData, caseState).answers[question.id];
  const ready = answer.submitted && answer.choice !== '';
  const choiceCorrect = answer.choice !== '' && answer.choice === question.correct;
  const sourceIds = new Set(evidenceOf(caseData).map(item => item.id));
  const sets = [question.requiredEvidence,
    ...(Array.isArray(question.acceptableEvidenceSets) ? question.acceptableEvidenceSets : [])]
    .filter(set => Array.isArray(set) && set.every(id => safeId(id) && sourceIds.has(id)))
    .map(set => [...new Set(set)]);
  const cited = new Set(answer.cited);
  const evidenceCorrect = sets.some(set => set.length === cited.size && set.every(id => cited.has(id)));
  return {correct: ready && choiceCorrect && evidenceCorrect, choiceCorrect, evidenceCorrect, ready};
}

/** Completion is derived, so a persisted completed flag cannot award progress. */
export function caseProgress(caseData, caseState) {
  const clean = cleanCase(caseData, caseState), questions = questionsOf(caseData);
  const correct = questions.filter(question => grade(caseData, clean, question.id).correct).length;
  return {
    opened: clean.opened.length,
    correct,
    total: questions.length,
    complete: questions.length > 0 && correct === questions.length,
  };
}
