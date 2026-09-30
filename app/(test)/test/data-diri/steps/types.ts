import type { PersonalDataForm } from "@/lib/assessment/personal-data";

// Setiap langkah menerima isi formulir dan fungsi pengubah; perubahan dilakukan pada salinan formulir.
// `issues`: label kesalahan langkah ini (kosong sebelum "Kirim" pertama), untuk pesan di bawah kolom.
export type StepProps = {
  form: PersonalDataForm;
  update: (change: (form: PersonalDataForm) => void) => void;
  issues: readonly string[];
};
