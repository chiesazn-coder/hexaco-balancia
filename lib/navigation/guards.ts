// Tabel pengalihan halaman kandidat (murni, tanpa Firebase) agar setiap barisnya bisa diuji.
import { HOME_PATH } from "../assessment/progress";
import { withNext } from "./next-path";

export const DATA_DIRI_PATH = "/test/data-diri";

export type GuardedPage = "beranda" | "test-hub" | "profile" | "data-diri";
export type GuardState =
  | { signedIn: false }
  | { signedIn: true; profileComplete: boolean; allTestsDone?: boolean; next?: string | null };

// Tujuan pengalihan untuk `page` pada keadaan `state`, atau null bila kandidat tetap di halaman itu.
// - Belum login: ke /login (formulir Data Diri membawa ?next= agar kandidat kembali ke formulir).
// - Profil belum lengkap: ke /profile (Data Diri membawa ?next=). Halaman profil sendiri tetap dibuka.
// - Profil sudah lengkap di halaman profil: ke ?next= yang sah, atau beranda.
// - Hub dengan semua tes selesai: ke /thankyou (yang kemudian logout). Beranda tidak pernah mengalihkan,
//   agar kandidat yang sudah menyelesaikan semua tes tetap bisa masuk tanpa ter-logout otomatis.
export function guardRedirect(page: GuardedPage, state: GuardState): string | null {
  const back = page === "data-diri" ? DATA_DIRI_PATH : null;
  if (!state.signedIn) return withNext("/login", back);
  if (page === "profile") return state.profileComplete ? state.next ?? HOME_PATH : null;
  if (!state.profileComplete) return withNext("/profile", back);
  if (page === "test-hub" && state.allTestsDone) return "/thankyou";
  return null;
}

// Setelah membuat akun baru: selalu isi profil dulu, membawa ?next= bila ada.
export const afterRegisterDestination = (next: string | null) => withNext("/profile", next);
