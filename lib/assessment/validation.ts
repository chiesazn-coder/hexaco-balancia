import { IST_SUBTESTS } from "../ist/subtests";
import { GRID } from "../kraepelin/grid";
import { PAPI_QUESTIONS } from "../papi/questions";
import { DISC_GROUPS } from "../disc/questions";
import { LOVE_LANGUAGE_ITEMS } from "../love-language/love-language-questions";
import { formFromStored, validPersonalData, validPersonalDataBackup, validPersonalDataDraft } from "./personal-data";

export const COLLECTIONS = {
  ist: "istSessions", papi: "papiSessions", disc: "discSessions",
  "love-language": "loveLanguageSessions", kraepelin: "kraepelinSessions", hexaco: "hexacoSessions",
  // Formulir Data Diri: memakai jalur submit/cadangan yang sama, tetapi bukan tes psikologi.
  "data-diri": "personalDataSessions",
} as const;
export type TestId = keyof typeof COLLECTIONS;
// Tes psikologi saja (tanpa Data Diri), untuk kode yang mengolah hasil tes, mis. audit skor.
export const PSYCH_TESTS = (Object.keys(COLLECTIONS) as TestId[]).filter(test => test !== "data-diri");
export const isTestId = (v: string): v is TestId => Object.hasOwn(COLLECTIONS, v);
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const choice = (v: unknown) => typeof v === "string" && /^[a-e]$/.test(v);
const digit = (v: unknown) => typeof v === "string" && /^[0-9]?$/.test(v);
const statement = (v: unknown) => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 4;
const list = (v: unknown, n: number, check: (v: unknown, i: number) => boolean) => Array.isArray(v) && v.length === n && v.every(check);

// Structural validation is shared with completion checks. No scoring keys belong here.
export function validAnswers(test: TestId, answers: unknown, draft = false): boolean {
  switch (test) {
    case "ist":
      return isRecord(answers) && exactKeys(answers, IST_SUBTESTS.map(s => s.key)) && IST_SUBTESTS.every(s =>
        list(answers[s.key], s.questions.length, v => v === null || (typeof v === "string" && (
          s.kind === "text" ? v.length > 0 && v.length <= 100 :
          s.kind === "sequence" ? /^[0-9]{1,4}$/.test(v) :
          s.kind === "word-problem" ? /^[0-9]{1,6}$/.test(v) : choice(v)))));
    case "papi": return list(answers, PAPI_QUESTIONS.length, v => v === "a" || v === "b" || (draft && v === null));
    case "disc": return list(answers, DISC_GROUPS.length, (v, i) => isRecord(v) &&
      (draft ? exactKeys(v, ["m", "l"]) : exactKeys(v, ["group", "m", "l"]) && v.group === DISC_GROUPS[i].no) &&
      (statement(v.m) || (draft && v.m === null)) && (statement(v.l) || (draft && v.l === null)) &&
      (v.m === null || v.l === null || v.m !== v.l));
    case "love-language": return list(answers, LOVE_LANGUAGE_ITEMS.length, (v, i) => draft
      ? v === null || v === 0 || v === 1
      : LOVE_LANGUAGE_ITEMS[i].options.some(o => o.letter === v));
    case "kraepelin": return list(answers, GRID.length, v => list(v, GRID[0].length - 1, digit));
    case "data-diri": return draft ? validPersonalDataDraft(answers) : validPersonalData(answers);
    case "hexaco": return isRecord(answers) && (draft || Object.keys(answers).length === 100) &&
      Object.entries(answers).every(([k, v]) => /^(?:[1-9]|[1-9][0-9]|100)$/.test(k) && Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 5);
  }
}

export function validDraft(test: TestId, data: unknown): boolean {
  if (!isRecord(data)) return false;
  if (test === "data-diri") return validPersonalDataBackup(data);
  if (test === "hexaco") return validAnswers(test, data, true);
  if (test === "kraepelin") {
    return Number.isInteger(data.colIdx) && Array.isArray(data.columns) && data.colIdx === data.columns.length &&
      data.columns.length <= GRID.length && data.columns.every(v => list(v, GRID[0].length - 1, digit)) &&
      (data.current === undefined || list(data.current, GRID[0].length - 1, digit)) &&
      (data.phase === undefined || ["countdown", "test", "done"].includes(String(data.phase))) &&
      (data.deadline === undefined || (typeof data.deadline === "number" && Number.isFinite(data.deadline) && data.deadline > 0));
  }
  if (!validAnswers(test, data.answers, true)) return false;
  if (test === "ist" && !(Number.isInteger(data.currentSubtest) && Number(data.currentSubtest) >= 0 && Number(data.currentSubtest) <= IST_SUBTESTS.length)) return false;
  return data.startedAt === undefined || data.startedAt === null || (typeof data.startedAt === "number" && Number.isFinite(data.startedAt) && data.startedAt > 0);
}

export function isCompletedSession(test: TestId, data: Record<string, unknown> | undefined, uid: string): boolean {
  if (!data || data.candidateId !== uid || !data.submittedAt) return false;
  // Struktur saja (mode draft): aturan waktu seperti batas usia tidak boleh membuat data lama tiba-tiba "tidak sah".
  if (test === "data-diri") return data.hasSubmitted === true && validPersonalDataDraft(formFromStored(data));
  const answers = test === "hexaco" ? data.responses : test === "kraepelin" && Array.isArray(data.answers)
    ? data.answers.map(v => isRecord(v) ? v.values : null) : data.answers;
  return (test === "hexaco" ? data.status === "completed" : data.hasSubmitted === true) && validAnswers(test, answers);
}
