import type { Timestamp } from "firebase/firestore";

// Nomor pernyataan dalam satu kelompok (1–4, urutan dari atas ke bawah di lembar asli).
export type DiscStatementNo = 1 | 2 | 3 | 4;

// Jawaban satu kelompok: m = paling menggambarkan, l = paling tidak menggambarkan (m ≠ l).
export interface DiscAnswer {
  group: number;
  m: DiscStatementNo;
  l: DiscStatementNo;
}

// Dokumen discSessions/{uid}. answers berisi tepat 24 entri, urut menurut nomor kelompok.
export interface DiscSession {
  candidateId: string;
  answers: DiscAnswer[];
  startedAt: Timestamp;
  submittedAt: Timestamp;
  hasSubmitted: true;
}
