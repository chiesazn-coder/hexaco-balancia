// Aturan data diri kandidat. Dipakai form profil, guard hub/halaman tes, dan API submit agar ketiganya
// selalu sepakat kapan profil dianggap lengkap.
export const GENDER_OPTIONS = ["Laki-laki", "Perempuan"] as const;
export const EDUCATION_OPTIONS = ["SMA/SMK", "D3", "S1", "S2", "S3"] as const;
export const MIN_AGE = 15;
export const MAX_AGE = 70;
export const MAX_NAME_LENGTH = 200;

const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Rentang tanggal lahir (YYYY-MM-DD) untuk usia MIN_AGE–MAX_AGE per hari ini; juga dipakai sebagai min/max input date.
export function birthDateRange(now = new Date()) {
  const shift = (years: number, days = 0) => ymd(new Date(now.getFullYear() - years, now.getMonth(), now.getDate() + days));
  // Inklusif: lahir sehari setelah ulang tahun ke-(MAX_AGE+1) masih berusia MAX_AGE.
  return { min: shift(MAX_AGE + 1, 1), max: shift(MIN_AGE) };
}

export function isValidBirthDate(value: unknown, now = new Date()): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Menolak tanggal yang tidak ada, mis. 2001-02-30.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const { min, max } = birthDateRange(now);
  return value >= min && value <= max;
}

export function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_NAME_LENGTH;
}

export function isProfileComplete(data: Record<string, unknown> | null | undefined): boolean {
  return !!data && isValidName(data.nama)
    && (GENDER_OPTIONS as readonly unknown[]).includes(data.jenisKelamin)
    && (EDUCATION_OPTIONS as readonly unknown[]).includes(data.pendidikan)
    && isValidBirthDate(data.tanggalLahir);
}
