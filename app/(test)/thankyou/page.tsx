"use client";

import { auth, db } from "@/lib/firebase";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SUB_TESTS } from "../subtests";

const KRAEPELIN_ID = "kraepelin";

// Tes yang ditambahkan belakangan. Diwajibkan bagi semua kandidat, kecuali masa tenggang di bawah berlaku.
const LATE_ADDED_TEST_IDS = ["ist", "papi", "hexaco", "disc"];

// Peluncuran tiap tes yang ditambahkan belakangan (Asia/Jakarta). Masa tenggang untuk tes X hanya berlaku
// bagi kandidat yang men-submit Kraepelin SEBELUM peluncuran tes X (mereka selesai sebelum tes itu ada);
// submit pada/setelah waktu itu tetap harus menyelesaikan tes X.
const IST_LAUNCH_MS = Date.parse("2026-09-21T00:00:00+07:00");
const PAPI_LAUNCH_MS = Date.parse("2026-09-22T00:00:00+07:00");
// Urutan tes diubah (IST, PAPI, Kraepelin) dan HEXACO disembunyikan dari hub.
const REORDER_LAUNCH_MS = Date.parse("2026-09-24T00:00:00+07:00");
const DISC_LAUNCH_MS = Date.parse("2026-09-25T00:00:00+07:00");

// Cutoff per id tes yang ditambahkan belakangan. Harus sejajar dengan LATE_ADDED_TEST_IDS.
const LATE_ADDED_LAUNCH_MS: Record<string, number> = { ist: IST_LAUNCH_MS, papi: PAPI_LAUNCH_MS, hexaco: REORDER_LAUNCH_MS, disc: DISC_LAUNCH_MS };

// Waktu submit (ms) dari dokumen kraepelinSessions, atau null bila tidak ada / tidak terbaca.
function getSubmittedMs(data: { submittedAt?: { toMillis?: () => number } } | undefined): number | null {
  const submittedAt = data?.submittedAt;
  return typeof submittedAt?.toMillis === "function" ? submittedAt.toMillis() : null;
}

// completion sejajar dengan SUB_TESTS. Tes tersembunyi (hidden) tidak wajib. Tes yang ditambahkan belakangan
// dibebaskan hanya bila Kraepelin disubmit sebelum peluncuran TES ITU SENDIRI (per tes, bukan satu cutoff
// global); tes lain (Kraepelin) selalu wajib.
function canShowThankYou(completion: boolean[], kraepelinSubmittedMs: number | null): boolean {
  return SUB_TESTS.every((subTest, index) => {
    if (completion[index] || subTest.hidden) return true;
    if (!LATE_ADDED_TEST_IDS.includes(subTest.id)) return false;
    const launchMs = LATE_ADDED_LAUNCH_MS[subTest.id];
    return kraepelinSubmittedMs !== null && kraepelinSubmittedMs < launchMs;
  });
}

export default function ThankYouPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let completed = false;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // signOut di bawah memicu callback ini lagi dengan user null; jangan diarahkan ke login.
        if (!completed) router.replace("/login");
        return;
      }

      try {
        // Satu kali baca kraepelinSessions dipakai untuk status selesai sekaligus tanggal submit (masa tenggang).
        // Gagal membaca -> null: fail open (tampilkan halaman ini) agar error sementara tidak memblokir kandidat.
        const [kraepelin, otherCompletion] = await Promise.all([
          getDoc(doc(db, "kraepelinSessions", currentUser.uid)).catch((readError) => {
            console.error(readError);
            return null;
          }),
          Promise.all(SUB_TESTS.map((subTest) => (subTest.id === KRAEPELIN_ID ? Promise.resolve(false) : subTest.isCompleted(currentUser.uid)))),
        ]);
        if (!active) return;
        const completion = otherCompletion.map((done, index) => (SUB_TESTS[index].id === KRAEPELIN_ID ? !!kraepelin?.exists() : done));
        const kraepelinSubmittedMs = kraepelin?.exists() ? getSubmittedMs(kraepelin.data()) : null;
        const allDone = kraepelin === null || canShowThankYou(completion, kraepelinSubmittedMs);
        if (!allDone) {
          router.replace("/test-hub");
          return;
        }
        completed = true;
        setIsVerified(true);
        await signOut(auth).catch(() => undefined);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setError("Status tes belum dapat diperiksa. Periksa koneksi Anda lalu muat ulang halaman ini.");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (!isVerified) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        {error ? <p role="alert" className="max-w-md text-center text-sm text-red-700">{error}</p> : <p className="text-sm font-medium text-slate-500">Memeriksa status tes...</p>}
      </main>
    );
  }

  return (
    <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f0ede8] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(44,50,60,.10)] sm:p-12">
        <CheckCircleIcon className="mx-auto h-20 w-20 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-primary">Terima Kasih!</h1>
        <p className="mt-5 leading-7 text-slate-600">Jawaban Anda telah berhasil disimpan. Tim HCGA PT Balancia akan menghubungi Anda untuk proses selanjutnya.</p>
        <p className="mt-8 text-sm text-slate-500">Anda dapat menutup halaman ini.</p>
      </section>
    </main>
  );
}
