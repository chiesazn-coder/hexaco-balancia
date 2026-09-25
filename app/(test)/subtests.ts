import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export type SubTestStatus = "completed" | "in_progress" | "available";

export interface SubTest {
  id: string;
  label: string;
  description: string;
  href: string;
  isCompleted: (uid: string) => Promise<boolean>;
  // Firestore hanya menyimpan sesi yang sudah selesai, jadi "sedang dikerjakan" hanya bisa dideteksi
  // dari cadangan jawaban di localStorage (per perangkat) milik tes tersebut.
  isInProgress: (uid: string) => boolean;
  // Tes tersembunyi tidak tampil di hub dan tidak wajib diselesaikan (halaman tesnya tetap ada).
  hidden?: boolean;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Urutan array = urutan tampil di hub (tes boleh dikerjakan dalam urutan apa pun).
// Untuk menambah tes baru, cukup tambahkan satu entri di sini.
export const SUB_TESTS: SubTest[] = [
  {
    id: "ist",
    label: "Tes Psikotes 1",
    description: "Tes inteligensi, 9 bagian.",
    href: "/test/ist",
    isCompleted: async (uid) => {
      // Rules istSessions belum tentu terpasang: gagal baca dianggap belum selesai.
      try {
        const snapshot = await getDoc(doc(db, "istSessions", uid));
        return snapshot.exists();
      } catch {
        return false;
      }
    },
    // Cadangan dibuat saat "Mulai Tes" ditekan dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`istProgress:${uid}`) !== null,
  },
  {
    id: "papi",
    label: "Tes Psikotes 2",
    description: "Tes kepribadian, 90 pernyataan.",
    href: "/test/papi",
    isCompleted: async (uid) => {
      // Rules papiSessions belum tentu terpasang: gagal baca dianggap belum selesai.
      try {
        const snapshot = await getDoc(doc(db, "papiSessions", uid));
        return snapshot.exists();
      } catch {
        return false;
      }
    },
    // Cadangan dibuat saat jawaban pertama dipilih dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`papiProgress:${uid}`) !== null,
  },
  {
    id: "disc",
    label: "Tes Psikotes 3",
    description: "Tes kepribadian, 24 kelompok pernyataan.",
    href: "/test/disc",
    isCompleted: async (uid) => {
      // Rules discSessions belum tentu terpasang: gagal baca dianggap belum selesai.
      try {
        const snapshot = await getDoc(doc(db, "discSessions", uid));
        return snapshot.exists();
      } catch {
        return false;
      }
    },
    // Cadangan dibuat saat jawaban pertama dipilih dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`discProgress:${uid}`) !== null,
  },
  {
    id: "love-language",
    label: "Tes Psikotes 4",
    description: "Tes preferensi, 30 pasang pernyataan.",
    href: "/test/love-language",
    isCompleted: async (uid) => {
      // Rules loveLanguageSessions belum tentu terpasang: gagal baca dianggap belum selesai.
      try {
        const snapshot = await getDoc(doc(db, "loveLanguageSessions", uid));
        return snapshot.exists();
      } catch {
        return false;
      }
    },
    // Cadangan dibuat saat jawaban pertama dipilih dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`loveLanguageProgress:${uid}`) !== null,
  },
  {
    id: "kraepelin",
    label: "Tes Psikotes 5",
    description: "Tes ketelitian dan ketahanan kerja.",
    href: "/test/kraepelin",
    isCompleted: async (uid) => {
      // Koleksi kraepelinSessions belum ada / rules belum tentu terpasang: gagal baca dianggap belum selesai.
      try {
        const snapshot = await getDoc(doc(db, "kraepelinSessions", uid));
        return snapshot.exists();
      } catch {
        return false;
      }
    },
    // Progres hanya disimpan setelah kolom pertama selesai (colIdx > 0).
    isInProgress: (uid) => {
      const raw = readStorage(`kraepelinProgress:${uid}`);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw) as { colIdx?: unknown };
        return typeof parsed.colIdx === "number" && parsed.colIdx > 0;
      } catch {
        return false;
      }
    },
  },
  {
    id: "hexaco",
    label: "Tes Psikotes 4",
    description: "Inventori kepribadian, 100 pernyataan.",
    href: "/test/hexaco",
    hidden: true,
    isCompleted: async (uid) => {
      const snapshot = await getDoc(doc(db, "hexacoCandidates", uid));
      return snapshot.exists() && snapshot.data().hasSubmitted === true;
    },
    // Cadangan jawaban dibuat saat jawaban pertama dipilih dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`hexacoResponses:${uid}`) !== null,
  },
];

// Tes yang tampil di hub. Tes tersembunyi juga dikecualikan dari status hub, agar cadangan localStorage-nya
// tidak membuat hub menganggap ada tes yang sedang dikerjakan.
export const VISIBLE_SUB_TESTS: SubTest[] = SUB_TESTS.filter((subTest) => !subTest.hidden);

// Judul tes yang ditampilkan ke peserta (mis. "Tes Psikotes 3"); jenis tes sengaja tidak disebutkan.
export function subTestLabel(id: string): string {
  return SUB_TESTS.find((subTest) => subTest.id === id)?.label ?? "Tes Psikotes";
}

// Hasil sejajar dengan VISIBLE_SUB_TESTS. Error dari tes mana pun (selain yang menanganinya sendiri) dilempar ke pemanggil.
export function loadCompletion(uid: string): Promise<boolean[]> {
  return Promise.all(VISIBLE_SUB_TESTS.map((subTest) => subTest.isCompleted(uid)));
}

// Mengembalikan id tes (mis. "hexaco") yang sedang dikerjakan, atau null. Tes yang sudah selesai
// (completedIds) dilewati agar cadangan localStorage yang basi tidak dianggap sedang dikerjakan.
export function getInProgressTest(uid: string, completedIds: readonly string[] = []): string | null {
  const active = VISIBLE_SUB_TESTS.find((subTest) => !completedIds.includes(subTest.id) && subTest.isInProgress(uid));
  return active?.id ?? null;
}

// Selesai = "completed"; tes yang sedang dikerjakan = "in_progress"; sisanya "available".
export function getStatuses(completion: boolean[], inProgressId: string | null): SubTestStatus[] {
  return completion.map((done, index) => (done ? "completed" : VISIBLE_SUB_TESTS[index].id === inProgressId ? "in_progress" : "available"));
}
