// Status tiap langkah wizard Data Diri untuk navigasi (dihitung dari isi formulir; bentuk draft tidak berubah).
import type { PersonalDataForm, PersonalDataIssue } from "./personal-data";

// Bagian formulir per langkah (0–8), sama dengan pembagian di personalDataIssues.
const STEP_KEYS: (keyof PersonalDataForm)[][] = [
  ["identitas"], ["keluarga"], ["pendidikan"], ["pekerjaan"], ["referensi"], ["minat"], ["sosial"], ["intern"], ["lainLain", "pernyataan"],
];

// Ada isian: teks tidak kosong, angka, jawaban Ya/Tidak, atau baris tabel yang berisi.
export function hasAnyValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasAnyValue);
  if (typeof value === "object") return Object.values(value).some(hasAnyValue);
  return false;
}

export type StepState = { filled: boolean; hasIssue: boolean; complete: boolean };

// Lengkap = tidak ada kesalahan di langkah itu dan minimal satu kolom terisi.
export function wizardStepStates(form: PersonalDataForm, issues: PersonalDataIssue[]): StepState[] {
  return STEP_KEYS.map((keys, step) => {
    const filled = keys.some((key) => hasAnyValue(form[key]));
    const hasIssue = issues.some((issue) => issue.step === step);
    return { filled, hasIssue, complete: filled && !hasIssue };
  });
}
