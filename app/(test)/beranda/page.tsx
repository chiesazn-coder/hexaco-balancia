"use client";

import { isProfileComplete } from "@/lib/assessment/profile";
import { testCardState } from "@/lib/assessment/progress";
import { auth, db } from "@/lib/firebase";
import { guardRedirect } from "@/lib/navigation/guards";
import { ArrowRightIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DataDiriCard, { useDataDiriStatus } from "../DataDiriCard";
import { VISIBLE_SUB_TESTS, type SubTestStatus, loadTestStatuses } from "../subtests";

// Beranda kandidat: pintu masuk ke rangkaian psikotes dan formulir Data Diri.
// Sengaja tidak mengalihkan ke hub/halaman terima kasih, agar kandidat yang sudah menyelesaikan semua tes
// tidak ter-logout otomatis hanya karena masuk kembali.
export default function BerandaPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [statuses, setStatuses] = useState<SubTestStatus[] | null>(null);
  const [testsError, setTestsError] = useState(false);
  const dataDiri = useDataDiriStatus(uid);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace(guardRedirect("beranda", { signedIn: false })!);
        return;
      }
      try {
        const profile = await getDocFromServer(doc(db, "hexacoCandidates", currentUser.uid));
        if (!active) return;
        const target = guardRedirect("beranda", { signedIn: true, profileComplete: isProfileComplete(profile.data()) });
        if (target) {
          router.replace(target);
          return;
        }
        setNama(String(profile.data()?.nama ?? "").trim());
        setUid(currentUser.uid);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setTestsError(true);
        return;
      }
      try {
        const next = await loadTestStatuses(currentUser.uid);
        if (active) setStatuses(next);
      } catch (caughtError) {
        console.error(caughtError);
        if (active) setTestsError(true);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  // Profil belum terbaca: tampilkan pesan pemuatan (atau galat bila profil gagal dibaca).
  if (!uid) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f6f3ec] px-5">
        {testsError ? (
          <div className="max-w-md text-center">
            <p role="alert" className="text-sm text-red-700">Data belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052f68]">Coba Lagi</button>
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">Memuat beranda...</p>
        )}
      </main>
    );
  }

  const total = VISIBLE_SUB_TESTS.length;
  const completedCount = statuses ? statuses.filter((status) => status === "completed").length : 0;
  const cardState = statuses ? testCardState(statuses) : null;

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f6f3ec]">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <p className="text-sm font-semibold text-slate-500">{nama ? "Halo, " + nama : "Halo"}</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">Beranda</h1>

        <div className="mt-10 space-y-5">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-primary p-8 shadow-[0_24px_60px_rgba(6,59,130,.18)] sm:p-10">
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-white"><ClipboardDocumentListIcon className="h-6 w-6" aria-hidden="true" /></span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Tes Psikotes</h2>
                <p className="text-sm text-white/70">{statuses ? completedCount + " dari " + total + " tes selesai" : total + " tes"}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-4">
              {testsError ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <p role="alert" className="text-sm text-white">Status tes belum dapat dimuat.</p>
                  <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary">Coba Lagi</button>
                </div>
              ) : cardState === null ? (
                <p className="text-sm text-white/70">Memeriksa progres tes...</p>
              ) : cardState === "done" ? (
                // Tanpa tombol: membuka hub saat semua tes selesai akan mengalihkan ke halaman terima kasih lalu logout.
                <p className="flex items-center gap-2 text-base font-bold text-white">
                  <CheckCircleIcon className="h-6 w-6 text-[#8fd19e]" aria-hidden="true" />
                  Semua tes sudah selesai
                </p>
              ) : (
                <button type="button" onClick={() => router.push("/test-hub")} className="flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-black/10 transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-300/40">
                  {cardState === "start" ? "Mulai Tes" : "Lanjutkan Tes"}
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>

          <DataDiriCard status={dataDiri} onOpen={() => router.push("/test/data-diri")} />
        </div>
      </div>
    </main>
  );
}
