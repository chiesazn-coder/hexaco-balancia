"use client";

import { auth, db } from "@/lib/firebase";
import { GRID } from "@/lib/kraepelin/grid";
import type { KraepelinScore } from "@/lib/kraepelin/scorer";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer as getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Mascot from "../../Mascot";
import { subTestLabel } from "../../subtests";

import { readBackup, restoreBackup, saveBackup, submitAnswers } from "@/lib/assessment/client";
import { isCompletedSession } from "@/lib/assessment/validation";
import { isProfileComplete } from "@/lib/assessment/profile";
import { advanceProgress, parseProgress, newProgress, emptyColumn, type KraepelinProgress } from "@/lib/kraepelin/progress";

const PAGE_TITLE = subTestLabel("kraepelin");

type State = "intro" | "countdown" | "test" | "result";

const TOTAL_COLUMNS = GRID.length;
const SLOTS = GRID[0].length - 1;
const TIME_LIMIT = 15;
const WARNING_AT = 5;
const COUNTDOWN_FROM = 3;

export default function KraepelinPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<State>("countdown");
  const [colIdx, setColIdx] = useState(0);
  const [columns, setColumns] = useState<string[][]>([]);
  const [current, setCurrent] = useState<string[]>(emptyColumn);
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [result, setResult] = useState<KraepelinScore | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Salinan jawaban kolom aktif agar callback timer selalu membaca nilai terbaru.
  const currentRef = useRef<string[]>(emptyColumn());
  const progressRef = useRef<KraepelinProgress | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submit = useCallback(async (allColumns: string[][], uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const { score } = await submitAnswers(uid, "kraepelin", allColumns);
      setResult(score ?? null);
      setPhase("result");
    } catch (caughtError) {
      console.error(caughtError);
      setSubmitError(caughtError instanceof Error ? caughtError.message : "Penyimpanan belum dapat dikonfirmasi. Tetap di halaman ini dan coba kirim ulang.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
          const candidate = await getDoc(doc(db, "hexacoCandidates", currentUser.uid));
          if (!active) return;
          if (!isProfileComplete(candidate.data())) {
            router.replace("/profile");
            return;
          }

        const session = await getDoc(doc(db, "kraepelinSessions", currentUser.uid));
        if (!active) return;
        if (session.exists() && !isCompletedSession("kraepelin", session.data(), currentUser.uid)) throw new Error("Hasil lama perlu diperiksa tim HCGA.");
        if (session.exists()) {
          router.replace("/thankyou");
          return;
        }

        await restoreBackup(currentUser.uid, "kraepelin");
        if (!active) return;
        const restored = parseProgress(readBackup(currentUser.uid, "kraepelin"), Date.now());
        setUser(currentUser);
        setIsChecking(false);
        if (!restored) { setPhase("intro"); return; }
        progressRef.current = restored;
        currentRef.current = restored.current;
        setCurrent(restored.current);
        setColumns(restored.columns);
        setColIdx(restored.colIdx);
        setPhase(restored.phase === "done" ? "test" : restored.phase);
        setTimeLeft(Math.max(0, Math.ceil((restored.deadline - Date.now()) / 1000)));
        setCountdown(Math.max(0, Math.ceil((restored.deadline - Date.now()) / 1000)));
        saveBackup(currentUser.uid, "kraepelin", restored);
        if (restored.phase === "done") void submit(restored.columns, currentUser.uid);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setLoadError(caughtError instanceof Error ? caughtError.message : "Data tes belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.");
        setIsChecking(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, submit]);

  // One persisted schedule drives both countdown and active column, including after refresh.
  useEffect(() => {
    if (isChecking || !user || phase === "intro" || phase === "result" || isSubmitting || submitError) return;
    const tick = () => {
      const saved = progressRef.current;
      if (!saved || saved.phase === "done") return;
      const next = advanceProgress(saved, Date.now());
      progressRef.current = next;
      if (next !== saved) {
        currentRef.current = next.current;
        setCurrent(next.current);
        setColumns(next.columns);
        setColIdx(next.colIdx);
        saveBackup(user.uid, "kraepelin", next);
        if (next.phase === "done") { void submit(next.columns, user.uid); return; }
        setPhase(next.phase);
      }
      const remaining = Math.max(0, Math.ceil((next.deadline - Date.now()) / 1000));
      if (next.phase === "countdown") setCountdown(remaining);
      else setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, isChecking, user, submit, isSubmitting, submitError]);

  function startTest() {
    if (!user) return;
    const progress = newProgress(Date.now());
    progressRef.current = progress;
    saveBackup(user.uid, "kraepelin", progress);
    setCountdown(COUNTDOWN_FROM);
    setPhase("countdown");
  }

  // Awal kolom: fokus ke input kosong pertama.
  useEffect(() => {
    if (phase !== "test" || isChecking) return;
    window.scrollTo({ top: 0 });
    const input = inputRefs.current[Math.max(0, currentRef.current.indexOf(""))];
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [phase, colIdx, isChecking]);

  useEffect(() => {
    if (phase !== "result") return;
    const timeout = setTimeout(() => router.push("/thankyou"), 3000);
    return () => clearTimeout(timeout);
  }, [phase, router]);

  function handleChange(slot: number, event: ChangeEvent<HTMLInputElement>) {
    if (!user || !progressRef.current || progressRef.current.phase !== "test" || Date.now() >= progressRef.current.deadline) return;
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...currentRef.current];
    next[slot] = digit;
    currentRef.current = next;
    setCurrent(next);
    progressRef.current = { ...progressRef.current, current: next };
    saveBackup(user.uid, "kraepelin", progressRef.current);

    if (digit === "" || slot >= SLOTS - 1) return;
    const nextInput = inputRefs.current[slot + 1];
    nextInput?.focus({ preventScroll: true });
    nextInput?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (loadError) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052f68]">Coba Lagi</button>
        </div>
      </main>
    );
  }

  if (isChecking) {
    return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5"><p className="text-sm font-medium text-slate-500">Menyiapkan tes...</p></main>;
  }

  if (phase === "result" && result) {
    const metrics = [
      { label: "Mean / kolom", value: result.mean.toFixed(2) },
      { label: "Range", value: String(result.range) },
      { label: "Errors", value: String(result.errors) },
      { label: "Skipped", value: String(result.skipped) },
    ];
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Tes selesai. Terima kasih.</h1>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{metric.value}</p>
              </div>
            ))}
          </div>
          <Link href="/thankyou" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">Lanjut →</Link>
        </section>
      </main>
    );
  }

  if (isSubmitting || submitError) {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        {submitError ? (
          <div className="max-w-md text-center">
            <p role="alert" className="text-sm text-red-700">{submitError}</p>
            <button type="button" onClick={() => user && void submit(columns, user.uid)} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#bf4821]">Kirim Ulang</button>
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">Menyimpan jawaban...</p>
        )}
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5 py-10">
        <div className="flex w-full max-w-4xl flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-14">
          <Mascot id="kraepelin" className="w-44 sm:w-52 lg:w-80" />
          <section className="w-full max-w-md text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-primary">{PAGE_TITLE}</h1>
            <div className="mt-6 space-y-3 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
              <p>Kamu akan melihat deretan angka dalam kolom.</p>
              <p>Jumlahkan dua angka yang berdekatan, lalu tulis digit terakhir dari hasilnya.</p>
              <p className="rounded-xl bg-blue-50 px-4 py-2.5 font-semibold text-primary">Contoh: 7 + 6 = 13 → tulis 3</p>
              <p>Setiap kolom berlangsung selama 15 detik.</p>
              <p>Kerjakan dari atas ke bawah, secepat mungkin.</p>
            </div>
            <button type="button" onClick={startTest} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai tes</button>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "countdown") {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        <div className="text-center" aria-live="polite">
          <p className="text-sm font-medium text-slate-500">Kolom {colIdx + 1} dari {TOTAL_COLUMNS} dimulai dalam</p>
          <p className="mt-4 text-8xl font-bold text-primary">{countdown}</p>
        </div>
      </main>
    );
  }

  const column = GRID[colIdx];
  if (!column) return null;
  const filled = current.filter((value) => value !== "").length;
  const isLocked = timeLeft <= 0;

  return (
    <main>
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-primary">Kolom {colIdx + 1} / {TOTAL_COLUMNS}</span>
            <span className="text-sm font-semibold text-slate-600">{filled} / {SLOTS}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= WARNING_AT ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }} />
            </div>
            <span className={`w-9 text-right text-sm font-bold tabular-nums ${timeLeft <= WARNING_AT ? "text-red-600" : "text-slate-700"}`}>{timeLeft}d</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL_COLUMNS }, (_, index) => (
            <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < colIdx ? "bg-blue-500" : index === colIdx ? "bg-blue-500 ring-2 ring-blue-300 ring-offset-1" : "border border-slate-300"}`} />
          ))}
        </div>

        <div className="mt-6 space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          {Array.from({ length: SLOTS }, (_, slot) => (
            <div key={slot} className="flex items-center justify-center gap-3 text-lg font-semibold text-slate-800">
              <span className="w-6 text-right text-xs font-medium text-slate-400">{slot + 1}</span>
              <span className="w-6 text-center">{column[slot]}</span>
              <span className="text-slate-400">+</span>
              <span className="w-6 text-center">{column[slot + 1]}</span>
              <span className="text-slate-400">=</span>
              <input
                ref={(element) => { inputRefs.current[slot] = element; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                autoComplete="off"
                aria-label={`Jawaban baris ${slot + 1}`}
                value={current[slot]}
                disabled={isLocked}
                onChange={(event) => handleChange(slot, event)}
                onFocus={(event) => event.target.select()}
                className={`h-10 w-10 rounded-lg border text-center text-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${current[slot] !== "" ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white"}`}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
