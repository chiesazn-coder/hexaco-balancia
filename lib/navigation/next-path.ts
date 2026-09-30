// Tujuan kembali setelah login/profil (?next=...). Hanya path internal yang ada di daftar izin yang diterima,
// supaya parameter ini tidak bisa dipakai untuk mengalihkan kandidat ke situs lain (open redirect).
export const NEXT_PATH_ALLOWLIST = ["/test/data-diri"] as const;

export function safeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) return null;
  // Tepat satu "/" di depan: menolak "//host", skema ("https:", "javascript:"), dan path relatif.
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  // Browser mengubah "/\host" menjadi "//host"; spasi dan karakter kontrol juga ditolak.
  if (/[\\\s\u0000-\u001f\u007f]/.test(raw) || raw.includes(":")) return null;
  return (NEXT_PATH_ALLOWLIST as readonly string[]).includes(raw) ? raw : null;
}

// Nilai ?next= dari URL halaman saat ini (dibaca di klien, tanpa useSearchParams agar halaman tetap statis).
export function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

export const withNext = (path: string, next: string | null) => (next ? path + "?next=" + encodeURIComponent(next) : path);
