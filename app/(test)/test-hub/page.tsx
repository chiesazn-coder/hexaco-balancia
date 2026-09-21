"use client";

import { auth } from "@/lib/firebase";
import { ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SUB_TESTS, SubTestStatus, getStatuses, loadCompletion } from "../subtests";

const statusLabels: Record<SubTestStatus, string> = {
  completed: "Selesai",
  current: "Berikutnya",
  locked: "Terkunci",
};

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
        const next = getStatuses(await loadCompletion(currentUser.uid));
        if (!active) return;
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
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052f68]">Coba Lagi</button>
        </div>
      </main>
    );
  }

  if (!statuses) {
    return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5"><p className="text-sm font-medium text-slate-500">Memeriksa progres tes...</p></main>;
  }

  const completedCount = statuses.filter((status) => status === "completed").length;

  return (
    <main className="mx-auto max-w-xl px-5 py-10 sm:py-14">
      <div className="rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Rangkaian Tes</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Selesaikan seluruh tes berikut secara berurutan. {completedCount} dari {SUB_TESTS.length} tes selesai.</p>

        <ol className="mt-8 space-y-3">
          {SUB_TESTS.map((subTest, index) => {
            const status = statuses[index];
            return (
              <li key={subTest.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${status === "current" ? "border-primary bg-blue-50/60" : "border-slate-200 bg-white"}`}>
                <div className="shrink-0">
                  {status === "completed" && <CheckCircleIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />}
                  {status === "current" && <ArrowRightIcon className="h-8 w-8 rounded-full bg-primary p-1.5 text-white" aria-hidden="true" />}
                  {status === "locked" && <LockClosedIcon className="h-8 w-8 rounded-full bg-slate-100 p-1.5 text-slate-400" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${status === "locked" ? "text-slate-400" : "text-slate-800"}`}>{index + 1}. {subTest.label}</p>
                  <p className="text-xs leading-5 text-slate-500">{subTest.description}</p>
                  <p className={`mt-0.5 text-xs font-semibold ${status === "completed" ? "text-emerald-600" : status === "current" ? "text-accent" : "text-slate-400"}`}>{statusLabels[status]}</p>
                </div>
                <button type="button" disabled={status !== "current"} onClick={() => router.push(subTest.href)} className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200">Mulai</button>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
