import {
  AN_QUESTIONS,
  FA_QUESTIONS,
  GE_QUESTIONS,
  ME_QUESTIONS,
  RA_QUESTIONS,
  SE_QUESTIONS,
  WA_QUESTIONS,
  WU_QUESTIONS,
  ZR_QUESTIONS,
  type ChoiceQuestion,
  type FaQuestion,
  type GeQuestion,
  type RaQuestion,
  type WuQuestion,
  type ZrQuestion,
} from "./questions";
import type { IstAnswers } from "./scorer";

export type IstKey = keyof IstAnswers;

interface IstSubtestBase {
  key: IstKey;
  name: string;
  instruction: string;
  durationSeconds: number;
}

export type IstSubtest =
  | (IstSubtestBase & { kind: "choice"; questions: ChoiceQuestion[]; memorizeSeconds?: number }) // SE, WA, AN, ME
  | (IstSubtestBase & { kind: "sequence"; questions: ZrQuestion[] }) // ZR
  | (IstSubtestBase & { kind: "text"; questions: GeQuestion[] }) // GE
  | (IstSubtestBase & { kind: "word-problem"; questions: RaQuestion[] }) // RA
  | (IstSubtestBase & { kind: "image-fa"; questions: FaQuestion[] }) // FA
  | (IstSubtestBase & { kind: "image-wu"; questions: WuQuestion[] }); // WU

// Urutan pengerjaan = urutan array ini. ME punya dua fase: hafal (memorizeSeconds) lalu kerjakan (durationSeconds).
export const IST_SUBTESTS: IstSubtest[] = [
  {
    key: "se",
    name: "SE — Satzergänzung",
    instruction: "Pilih satu jawaban yang paling tepat untuk melengkapi kalimat.",
    kind: "choice",
    questions: SE_QUESTIONS,
    durationSeconds: 6 * 60,
  },
  {
    key: "wa",
    name: "WA — Wortauswahl",
    instruction: "Pilih satu kata yang TIDAK termasuk dalam kelompok kata lainnya.",
    kind: "choice",
    questions: WA_QUESTIONS,
    durationSeconds: 6 * 60,
  },
  {
    key: "an",
    name: "AN — Analogien",
    instruction: "Temukan hubungan antara dua kata pertama, lalu pilih kata yang hubungannya sama dengan kata berikutnya.",
    kind: "choice",
    questions: AN_QUESTIONS,
    durationSeconds: 7 * 60,
  },
  {
    key: "ge",
    name: "GE — Gemeinsamkeiten",
    instruction: "Temukan satu kata yang mencakup kedua kata yang diberikan, lalu ketik jawaban Anda.",
    kind: "text",
    questions: GE_QUESTIONS,
    durationSeconds: 8 * 60,
  },
  {
    key: "ra",
    name: "RA — Rechenaufgaben",
    instruction: "Kerjakan soal hitungan berikut, lalu ketik jawabannya berupa angka.",
    kind: "word-problem",
    questions: RA_QUESTIONS,
    durationSeconds: 10 * 60,
  },
  {
    key: "zr",
    name: "ZR — Zahlenreihen",
    instruction: "Lanjutkan deret angka berikut dengan satu angka yang tepat.",
    kind: "sequence",
    questions: ZR_QUESTIONS,
    durationSeconds: 10 * 60,
  },
  {
    key: "fa",
    name: "FA — Figurenauswahl",
    instruction: "Pilih susunan potongan gambar (A–E) yang dapat membentuk satu bentuk utuh.",
    kind: "image-fa",
    questions: FA_QUESTIONS,
    durationSeconds: 7 * 60,
  },
  {
    key: "wu",
    name: "WU — Würfelaufgaben",
    instruction: "Pilih kubus (A–E) yang sama dengan kubus referensi di atas.",
    kind: "image-wu",
    questions: WU_QUESTIONS,
    durationSeconds: 9 * 60,
  },
  {
    key: "me",
    name: "ME — Merkaufgaben",
    instruction: "Kata-kata yang tadi Anda hafalkan dibagi dalam lima golongan. Pilih golongan dari kata yang berawalan huruf berikut.",
    kind: "choice",
    questions: ME_QUESTIONS,
    memorizeSeconds: 3 * 60,
    durationSeconds: 6 * 60,
  },
];

export const createEmptyAnswers = (): IstAnswers => ({
  se: Array<string | null>(SE_QUESTIONS.length).fill(null),
  wa: Array<string | null>(WA_QUESTIONS.length).fill(null),
  an: Array<string | null>(AN_QUESTIONS.length).fill(null),
  ge: Array<string | null>(GE_QUESTIONS.length).fill(null),
  ra: Array<string | null>(RA_QUESTIONS.length).fill(null),
  zr: Array<string | null>(ZR_QUESTIONS.length).fill(null),
  fa: Array<string | null>(FA_QUESTIONS.length).fill(null),
  wu: Array<string | null>(WU_QUESTIONS.length).fill(null),
  me: Array<string | null>(ME_QUESTIONS.length).fill(null),
});
