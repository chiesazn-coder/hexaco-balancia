import type { Timestamp } from "firebase/firestore";
import type { LoveLanguageLetter } from "@/lib/love-language/love-language-questions";

export type { LoveLanguageLetter };

// Dokumen loveLanguageSessions/{uid}. answers berisi tepat 30 entri, urut menurut nomor soal;
// tiap entri = huruf kategori (A–E) dari pernyataan yang dipilih.
export interface LoveLanguageSession {
  candidateId: string;
  answers: LoveLanguageLetter[];
  startedAt: Timestamp;
  submittedAt: Timestamp;
  hasSubmitted: true;
}
