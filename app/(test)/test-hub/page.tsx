"use client";

import { auth } from "@/lib/firebase";
import { ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VISIBLE_SUB_TESTS, SubTestStatus, getInProgressTest, getStatuses, loadCompletion } from "../subtests";

// Sementara nonaktif (masih ditinjau HR): semua tes yang belum selesai bebas dibuka. Ubah ke true agar tes lain
// terkunci selama ada tes yang sedang dikerjakan.
const LOCK_WHILE_IN_PROGRESS = false;

export default function TestHubPage() {
  const router = useRouter();
  const [statuses, setStatuses] = useState<SubTestStatus[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const completion = await loadCompletion(currentUser.uid);
        if (!active) return;
        const completedIds = VISIBLE_SUB_TESTS.filter((_, index) => completion[index]).map((subTest) => subTest.id);
        const next = getStatuses(completion, getInProgressTest(currentUser.uid, completedIds));
        if (next.every((status) => status === "completed")) {
          router.replace("/thankyou");
          return;
        }
        setStatuses(next);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setError("Progres tes belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f6f3ec] px-5">
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052f68]">Coba Lagi</button>
        </div>
      </main>
    );
  }

  if (!statuses) {
    return <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f6f3ec] px-5"><p className="text-sm font-medium text-slate-500">Memeriksa progres tes...</p></main>;
  }

  const completedCount = statuses.filter((status) => status === "completed").length;
  const hasInProgress = statuses.includes("in_progress");
  const isLocked = LOCK_WHILE_IN_PROGRESS && hasInProgress;
  // Kartu utama: tes yang sedang dikerjakan, atau tes pertama yang belum selesai.
  const featuredIndex = hasInProgress ? statuses.indexOf("in_progress") : statuses.indexOf("available");
  const featured = VISIBLE_SUB_TESTS[featuredIndex];
  const featuredInProgress = statuses[featuredIndex] === "in_progress";
  const lastIndex = VISIBLE_SUB_TESTS.length - 1;

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f6f3ec]">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">Rangkaian <span className="text-accent">Psikotes</span></h1>
          <p className="pb-1 text-sm font-medium text-slate-500">{completedCount} dari {VISIBLE_SUB_TESTS.length} tes selesai</p>
        </div>

        <ol className="mt-10 flex" aria-label="Progres tes">
          {VISIBLE_SUB_TESTS.map((subTest, index) => {
            const status = statuses[index];
            return (
              <li key={subTest.id} className={index < lastIndex ? "flex-1" : ""}>
                <div className="flex items-center">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${status === "completed" ? "bg-[#3d7a4f] text-white" : status === "in_progress" ? "bg-accent text-white ring-4 ring-accent/15" : "border-2 border-[#d9d2c3] bg-[#f6f3ec] text-slate-500"}`} aria-hidden="true">
                    {status === "completed" ? <CheckIcon className="h-5 w-5" /> : index + 1}
                  </div>
                  {index < lastIndex && <div className={`h-0.5 flex-1 ${status === "completed" ? "bg-[#3d7a4f]" : "bg-[#e2dccf]"}`} />}
                </div>
                <p className={`mt-3 whitespace-nowrap text-sm ${status === "completed" ? "font-semibold text-slate-900" : status === "in_progress" ? "font-bold text-accent" : "font-medium text-slate-500"}`}>
                  Tes {index + 1}{status === "in_progress" && <span className="hidden sm:inline"> · berjalan</span>}
                  <span className="sr-only">{status === "completed" ? " selesai" : status === "in_progress" ? " sedang dikerjakan" : " belum dikerjakan"}</span>
                </p>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-primary p-8 shadow-[0_24px_60px_rgba(6,59,130,.18)] sm:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f4a57f]">{featuredInProgress ? "Sedang dikerjakan" : "Tes berikutnya"}</p>
            <span className="pointer-events-none absolute right-8 top-6 text-8xl font-extrabold tracking-tight text-white/10 sm:right-12 sm:text-9xl" aria-hidden="true">{String(featuredIndex + 1).padStart(2, "0")}</span>
            <div className="mt-16 flex flex-wrap items-end justify-between gap-5">
              <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{featured.label}</h2>
              <button type="button" onClick={() => router.push(featured.href)} className="flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-black/10 transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-300/40">
                {featuredInProgress ? "Lanjutkan" : "Mulai"}
                <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </section>

          <ul className="flex flex-col gap-4">
            {VISIBLE_SUB_TESTS.map((subTest, index) => {
              if (index === featuredIndex) return null;
              const status = statuses[index];
              if (status === "completed") {
                return (
                  <li key={subTest.id} className="flex flex-1 items-center justify-between rounded-3xl bg-white px-7 py-7 shadow-[0_10px_30px_rgba(44,50,60,.05)]">
                    <span className="text-lg font-semibold text-slate-900">{subTest.label}</span>
                    <span className="text-xs font-bold text-[#3d7a4f]">Selesai</span>
                  </li>
                );
              }
              if (isLocked) {
                return (
                  <li key={subTest.id} className="flex flex-1 items-center justify-between rounded-3xl border border-[#e2dccf] px-7 py-7">
                    <span className="text-lg font-medium text-slate-600">{subTest.label}</span>
                    <LockClosedIcon className="h-5 w-5 text-slate-500" aria-label="Terkunci" />
                  </li>
                );
              }
              return (
                <li key={subTest.id} className="flex flex-1">
                  <button type="button" onClick={() => router.push(subTest.href)} className="group flex w-full items-center justify-between rounded-3xl border border-[#e2dccf] bg-white/50 px-7 py-7 text-left transition hover:border-accent/40 hover:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100">
                    <span className="text-lg font-semibold text-slate-800">{subTest.label}</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-accent">Mulai<ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-10 text-sm text-slate-600">
          {isLocked ? `Tes yang terkunci akan terbuka setelah ${featured.label} selesai.` : "Tes dapat dikerjakan dalam urutan apa pun."}
        </p>
      </div>
    </main>
  );
}
