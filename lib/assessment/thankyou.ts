// Aturan halaman terima kasih (tanpa Firebase, agar bisa diuji): syarat tampil, masa tenggang tes yang
// ditambahkan belakangan, baca status Data Diri (paralel, dibatasi waktu), lalu logout.

const KRAEPELIN_ID = "kraepelin";
// Batas tunggu baca status Data Diri agar logout tidak tertunda oleh pembacaan yang lambat.
export const DATA_DIRI_READ_TIMEOUT_MS = 3000;

// Tes yang ditambahkan belakangan. Diwajibkan bagi semua kandidat, kecuali masa tenggang di bawah berlaku.
const LATE_ADDED_TEST_IDS = ["ist", "papi", "hexaco", "disc", "love-language"];

// Peluncuran tiap tes yang ditambahkan belakangan (Asia/Jakarta). Masa tenggang untuk tes X hanya berlaku
// bagi kandidat yang men-submit Kraepelin SEBELUM peluncuran tes X (mereka selesai sebelum tes itu ada);
// submit pada/setelah waktu itu tetap harus menyelesaikan tes X.
const IST_LAUNCH_MS = Date.parse("2026-09-21T00:00:00+07:00");
const PAPI_LAUNCH_MS = Date.parse("2026-09-22T00:00:00+07:00");
// Urutan tes diubah (IST, PAPI, Kraepelin) dan HEXACO disembunyikan dari hub.
const REORDER_LAUNCH_MS = Date.parse("2026-09-24T00:00:00+07:00");
const DISC_LAUNCH_MS = Date.parse("2026-09-25T00:00:00+07:00");
const LOVE_LANGUAGE_LAUNCH_MS = Date.parse("2026-09-26T00:00:00+07:00");

// Cutoff per id tes yang ditambahkan belakangan. Harus sejajar dengan LATE_ADDED_TEST_IDS.
export const LATE_ADDED_LAUNCH_MS: Record<string, number> = { ist: IST_LAUNCH_MS, papi: PAPI_LAUNCH_MS, hexaco: REORDER_LAUNCH_MS, disc: DISC_LAUNCH_MS, "love-language": LOVE_LANGUAGE_LAUNCH_MS };

// Waktu submit (ms) dari dokumen kraepelinSessions, atau null bila tidak ada / tidak terbaca.
export function getSubmittedMs(data: { submittedAt?: { toMillis?: () => number } } | undefined): number | null {
  const submittedAt = data?.submittedAt;
  return typeof submittedAt?.toMillis === "function" ? submittedAt.toMillis() : null;
}

type SubTestInfo = { id: string; hidden?: boolean };

// completion sejajar dengan subTests. Tes tersembunyi (hidden) tidak wajib. Tes yang ditambahkan belakangan
// dibebaskan hanya bila Kraepelin disubmit sebelum peluncuran TES ITU SENDIRI (per tes, bukan satu cutoff
// global); tes lain (Kraepelin) selalu wajib.
export function canShowThankYou(subTests: readonly SubTestInfo[], completion: boolean[], kraepelinSubmittedMs: number | null): boolean {
  return subTests.every((subTest, index) => {
    if (completion[index] || subTest.hidden) return true;
    if (!LATE_ADDED_TEST_IDS.includes(subTest.id)) return false;
    const launchMs = LATE_ADDED_LAUNCH_MS[subTest.id];
    return kraepelinSubmittedMs !== null && kraepelinSubmittedMs < launchMs;
  });
}

// Hasil `promise`, atau `fallback` bila belum selesai dalam `ms` milidetik.
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export type KraepelinRead = { exists: boolean; valid: boolean; submittedMs: number | null };
export type ThankYouDeps = {
  subTests: readonly (SubTestInfo & { isCompleted: () => Promise<boolean> })[];
  readKraepelin: () => Promise<KraepelinRead>;
  readDataDiriSubmitted: () => Promise<boolean>;
  isActive: () => boolean;
  toHub: () => void;
  // Dipanggil sebelum logout, karena setelah logout callback auth menerima user null.
  onVerified: (dataDiriSubmitted: boolean) => void;
  signOut: () => Promise<unknown>;
  dataDiriTimeoutMs?: number;
};

// Satu kali baca kraepelinSessions dipakai untuk status selesai sekaligus tanggal submit (masa tenggang).
// Status Data Diri dibaca bersamaan (tanpa menambah waktu tunggu); gagal/lambat = belum terkirim (pengingat tampil),
// dan logout tetap dijalankan. Kesalahan baca tes (bukan Data Diri) dilempar ke pemanggil, tanpa logout.
export async function runThankYouCheck(deps: ThankYouDeps): Promise<"inactive" | "hub" | "done"> {
  const dataDiri = Promise.resolve().then(deps.readDataDiriSubmitted).catch(() => false);
  const [kraepelin, otherCompletion, dataDiriSubmitted] = await Promise.all([
    deps.readKraepelin(),
    Promise.all(deps.subTests.map((subTest) => (subTest.id === KRAEPELIN_ID ? Promise.resolve(false) : subTest.isCompleted()))),
    withTimeout(dataDiri, deps.dataDiriTimeoutMs ?? DATA_DIRI_READ_TIMEOUT_MS, false),
  ]);
  if (!deps.isActive()) return "inactive";
  if (kraepelin.exists && !kraepelin.valid) throw new Error("Hasil Kraepelin perlu diperiksa tim HCGA.");
  const completion = otherCompletion.map((done, index) => (deps.subTests[index].id === KRAEPELIN_ID ? kraepelin.exists : done));
  if (!canShowThankYou(deps.subTests, completion, kraepelin.exists ? kraepelin.submittedMs : null)) {
    deps.toHub();
    return "hub";
  }
  deps.onVerified(dataDiriSubmitted);
  await deps.signOut().catch(() => undefined);
  return "done";
}
