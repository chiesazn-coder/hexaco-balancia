// Kolom tanggal formulir: ditampilkan dan diketik sebagai HH/BB/TTTT (tidak bergantung locale browser),
// disimpan sebagai YYYY-MM-DD.
import { isCalendarDate } from "./personal-data";

export const DATE_PLACEHOLDER = "HH/BB/TTTT";

// "1999-03-12" -> "12/03/1999"; nilai kosong/tidak sah -> "".
export function isoToDisplay(iso: string) {
  if (!isCalendarDate(iso)) return "";
  const [y, m, d] = iso.split("-");
  return d + "/" + m + "/" + y;
}

// "12/03/1999", "12-3-1999", "1.3.1999", atau "12031999" -> "1999-03-12"; selain itu null.
export function displayToIso(text: string): string | null {
  const trimmed = text.trim();
  const parts = /^\d{8}$/.test(trimmed)
    ? [trimmed.slice(0, 2), trimmed.slice(2, 4), trimmed.slice(4)]
    : /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(trimmed)?.slice(1);
  if (!parts) return null;
  const iso = parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
  return isCalendarDate(iso) ? iso : null;
}

// Saat mengetik angka saja, garis miring disisipkan otomatis (12031999 -> 12/03/1999).
// Bila kandidat mengetik pemisah sendiri (mis. 1/3/1999), teks dibiarkan dan dirapikan saat kolom ditinggalkan.
export function formatDateTyping(raw: string) {
  const cleaned = raw.replace(/[^\d/.\-]/g, "");
  if (/[/.\-]/.test(cleaned) && !/^\d{2}\/(\d{2}\/?)?\d{0,4}$/.test(cleaned)) return cleaned.slice(0, 10);
  const digits = cleaned.replace(/\D/g, "").slice(0, 8);
  return digits.slice(0, 2) + (digits.length > 2 ? "/" + digits.slice(2, 4) : "") + (digits.length > 4 ? "/" + digits.slice(4) : "");
}
