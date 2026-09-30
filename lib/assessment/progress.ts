// Aturan murni (tanpa Firebase) untuk beranda dan tujuan setelah login, agar bisa diuji langsung.
import { withNext } from "../navigation/next-path";

export type TestStatus = "completed" | "in_progress" | "available";
export type TestCardState = "start" | "continue" | "done";

export const HOME_PATH = "/beranda";

// Kartu Tes Psikotes di beranda, dari status yang sama dengan hub (getStatuses).
// "done" hanya bila semua tes selesai — sama dengan syarat hub mengalihkan ke halaman terima kasih.
export function testCardState(statuses: readonly TestStatus[]): TestCardState {
  if (statuses.length > 0 && statuses.every((status) => status === "completed")) return "done";
  return statuses.some((status) => status !== "available") ? "continue" : "start";
}

// Tujuan setelah login/profil: tujuan ?next= yang sah, atau beranda; profil belum lengkap selalu ke /profile dulu.
export function postLoginDestination(profileComplete: boolean, next: string | null): string {
  return profileComplete ? next ?? HOME_PATH : withNext("/profile", next);
}
