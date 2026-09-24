import { AN_QUESTIONS, ME_QUESTIONS, RA_QUESTIONS, SE_QUESTIONS, WA_QUESTIONS, ZR_QUESTIONS } from "./questions";

// Jawaban per bagian. Pilihan ganda: 'a'–'e'. ZR: angka diketik sebagai string. GE: jawaban bebas (teks).
// RA: angka diketik sebagai string. FA/WU: pilihan 'a'–'e'. null = belum dijawab.
export interface IstAnswers {
  se: (string | null)[];
  wa: (string | null)[];
  an: (string | null)[];
  ge: (string | null)[];
  ra: (string | null)[];
  zr: (string | null)[];
  fa: (string | null)[];
  wu: (string | null)[];
  me: (string | null)[];
}

// SE/WA/AN/RA/ZR/ME punya kunci jawaban dan dinilai otomatis (angka). GE/FA/WU tidak punya kunci jawaban dan
// tidak punya skor numerik — jawaban mentahnya sudah tersimpan di IstAnswers/answers.{ge,fa,wu} untuk
// dinilai manual oleh HR, jadi tidak diduplikasi di sini.
export interface IstScores {
  se: number;
  wa: number;
  an: number;
  ra: number;
  zr: number;
  me: number;
  total: number;
}

// Jumlah soal yang belum dijawab per bagian (semua 9 bagian, termasuk yang dinilai manual).
export interface IstUnansweredCounts {
  se: number;
  wa: number;
  an: number;
  ge: number;
  ra: number;
  zr: number;
  fa: number;
  wu: number;
  me: number;
  total: number;
}

const isEmpty = (value: string | null | undefined) => value === null || value === undefined || value === "";

// Skor = jumlah jawaban benar (soal tidak dijawab dihitung salah). unanswered = jumlah soal tanpa jawaban.
// GE/FA/WU tidak punya kunci jawaban dan tidak masuk ke scores sama sekali (lihat IstScores); hanya
// dihitung jumlah belum terjawabnya (unanswered) di sini.
export function scoreIst(answers: IstAnswers): { scores: IstScores; unanswered: IstUnansweredCounts } {
  const choice = (questions: { answer: string }[], given: (string | null)[]) => ({
    score: questions.filter((question, i) => given[i] === question.answer).length,
    unanswered: questions.filter((_, i) => isEmpty(given[i])).length,
  });
  // RA & ZR: jawaban angka diketik sebagai string.
  const number = (questions: { answer: number }[], given: (string | null)[]) => ({
    score: questions.filter((question, i) => !isEmpty(given[i]) && parseInt(given[i] as string, 10) === question.answer).length,
    unanswered: questions.filter((_, i) => isEmpty(given[i])).length,
  });
  const unscored = (questionCount: number, given: (string | null)[]) => ({
    unanswered: Array.from({ length: questionCount }, (_, i) => given[i]).filter((value) => isEmpty(value)).length,
  });

  const se = choice(SE_QUESTIONS, answers.se);
  const wa = choice(WA_QUESTIONS, answers.wa);
  const an = choice(AN_QUESTIONS, answers.an);
  const ra = number(RA_QUESTIONS, answers.ra);
  const zr = number(ZR_QUESTIONS, answers.zr);
  const me = choice(ME_QUESTIONS, answers.me);
  const ge = unscored(answers.ge.length, answers.ge);
  const fa = unscored(answers.fa.length, answers.fa);
  const wu = unscored(answers.wu.length, answers.wu);

  return {
    scores: {
      se: se.score,
      wa: wa.score,
      an: an.score,
      ra: ra.score,
      zr: zr.score,
      me: me.score,
      total: se.score + wa.score + an.score + ra.score + zr.score + me.score,
    },
    unanswered: {
      se: se.unanswered,
      wa: wa.unanswered,
      an: an.unanswered,
      ge: ge.unanswered,
      ra: ra.unanswered,
      zr: zr.unanswered,
      fa: fa.unanswered,
      wu: wu.unanswered,
      me: me.unanswered,
      total: se.unanswered + wa.unanswered + an.unanswered + ge.unanswered + ra.unanswered + zr.unanswered + fa.unanswered + wu.unanswered + me.unanswered,
    },
  };
}
