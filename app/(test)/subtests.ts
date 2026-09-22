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
    id: "hexaco",
    label: "Tes Psikotes 1",
    description: "Inventori kepribadian, 100 pernyataan.",
    href: "/test/hexaco",
    isCompleted: async (uid) => {
      const snapshot = await getDoc(doc(db, "hexacoCandidates", uid));
      return snapshot.exists() && snapshot.data().hasSubmitted === true;
    },
    // Cadangan jawaban dibuat saat jawaban pertama dipilih dan dihapus saat submit berhasil.
    isInProgress: (uid) => readStorage(`hexacoResponses:${uid}`) !== null,
  },
  {
    id: "kraepelin",
    label: "Tes Psikotes 2",
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
    id: "ist",
    label: "Tes Psikotes 3",
    description: "Tes inteligensi, 5 bagian.",
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
    label: "Tes Psikotes 4",
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
];

// Hasil sejajar dengan SUB_TESTS. Error dari tes mana pun (selain yang menanganinya sendiri) dilempar ke pemanggil.
export function loadCompletion(uid: string): Promise<boolean[]> {
  return Promise.all(SUB_TESTS.map((subTest) => subTest.isCompleted(uid)));
}

// Mengembalikan id tes (mis. "hexaco") yang sedang dikerjakan, atau null. Tes yang sudah selesai
// (completedIds) dilewati agar cadangan localStorage yang basi tidak dianggap sedang dikerjakan.
export function getInProgressTest(uid: string, completedIds: readonly string[] = []): string | null {
  const active = SUB_TESTS.find((subTest) => !completedIds.includes(subTest.id) && subTest.isInProgress(uid));
  return active?.id ?? null;
}

// Selesai = "completed"; tes yang sedang dikerjakan = "in_progress"; sisanya "available".
export function getStatuses(completion: boolean[], inProgressId: string | null): SubTestStatus[] {
  return completion.map((done, index) => (done ? "completed" : SUB_TESTS[index].id === inProgressId ? "in_progress" : "available"));
}
