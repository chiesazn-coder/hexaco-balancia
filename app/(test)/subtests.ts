import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export type SubTestStatus = "completed" | "current" | "locked";

export interface SubTest {
  id: string;
  label: string;
  description: string;
  href: string;
  isCompleted: (uid: string) => Promise<boolean>;
}

// Urutan array = urutan pengerjaan. Untuk menambah tes baru, cukup tambahkan satu entri di sini.
export const SUB_TESTS: SubTest[] = [
  {
    id: "hexaco",
    label: "HEXACO",
    description: "Inventori kepribadian, 100 pernyataan.",
    href: "/test/hexaco",
    isCompleted: async (uid) => {
      const snapshot = await getDoc(doc(db, "hexacoCandidates", uid));
      return snapshot.exists() && snapshot.data().hasSubmitted === true;
    },
  },
  {
    id: "kraepelin",
    label: "Kraepelin",
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
  },
];

// Hasil sejajar dengan SUB_TESTS. Error dari tes mana pun (selain yang menanganinya sendiri) dilempar ke pemanggil.
export function loadCompletion(uid: string): Promise<boolean[]> {
  return Promise.all(SUB_TESTS.map((subTest) => subTest.isCompleted(uid)));
}

// Tes pertama yang belum selesai menjadi "current"; sisanya yang belum selesai "locked".
export function getStatuses(completion: boolean[]): SubTestStatus[] {
  const currentIndex = completion.findIndex((done) => !done);
  return completion.map((done, index) => (done ? "completed" : index === currentIndex ? "current" : "locked"));
}
