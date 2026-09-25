"use client";

import { auth, db } from "@/lib/firebase";
import { DISC_GROUPS, DISC_TOTAL_GROUPS } from "@/lib/disc/questions";
import type { DiscAnswer, DiscStatementNo } from "@/lib/types/disc";
import { User, onAuthStateChanged } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Mascot from "../../Mascot";
import { subTestLabel } from "../../subtests";

const PAGE_TITLE = subTestLabel("disc");

type Phase = "intro" | "test" | "result";

// Pilihan satu kelompok selama tes berlangsung; null = belum dipilih.
type DiscPick = { m: DiscStatementNo | null; l: DiscStatementNo | null };
type Column = "m" | "l";

const TOTAL = DISC_TOTAL_GROUPS;
const STATEMENT_NOS: DiscStatementNo[] = [1, 2, 3, 4];
const storageKey = (uid: string) => `discProgress:${uid}`;
const emptyPicks = (): DiscPick[] => Array.from({ length: TOTAL }, () => ({ m: null, l: null }));
const isComplete = (pick: DiscPick) => pick.m !== null && pick.l !== null;

const isStatementNo = (value: unknown): value is DiscStatementNo | null =>
  value === null || value === 1 || value === 2 || value === 3 || value === 4;

// Hanya 24 kelompok berisi m/l bernilai null atau 1–4 (m ≠ l) yang dipulihkan; data lain dibuang dan tes
// mulai dari kosong. startedAt = waktu kandidat menekan "Mulai Tes" (ms), null bila tidak ada / tidak valid.
function readProgress(uid: string): { picks: DiscPick[]; startedAt: number | null } {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return { picks: emptyPicks(), startedAt: null };
    const parsed = JSON.parse(raw) as { answers?: unknown; startedAt?: unknown };
    const valid =
      Array.isArray(parsed.answers) &&
      parsed.answers.length === TOTAL &&
      parsed.answers.every((pick: { m?: unknown; l?: unknown } | null) =>
        typeof pick === "object" && pick !== null && isStatementNo(pick.m) && isStatementNo(pick.l) && (pick.m === null || pick.m !== pick.l)
      );
    if (valid) {
      const startedAt = typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt) && parsed.startedAt <= Date.now() ? parsed.startedAt : null;
      return { picks: parsed.answers as DiscPick[], startedAt };
    }
    localStorage.removeItem(storageKey(uid));
  } catch {
    try {
      localStorage.removeItem(storageKey(uid));
    } catch {
      // Diabaikan.
    }
  }
  return { picks: emptyPicks(), startedAt: null };
}

function saveProgress(uid: string, picks: DiscPick[], startedAt: number | null) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify({ answers: picks, startedAt }));
  } catch {
    // Cadangan lokal bersifat opsional.
  }
}

export default function DiscPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [picks, setPicks] = useState<DiscPick[]>(emptyPicks);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const picksRef = useRef<DiscPick[]>(emptyPicks());
  const startedAtRef = useRef<number | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const submit = useCallback(async (finalPicks: DiscPick[], uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Hanya dipanggil bila semua kelompok lengkap, jadi m/l di sini pasti terisi.
      const answers: DiscAnswer[] = finalPicks.map((pick, index) => ({
        group: DISC_GROUPS[index].no,
        m: pick.m as DiscStatementNo,
        l: pick.l as DiscStatementNo,
      }));
      await setDoc(doc(db, "discSessions", uid), {
        candidateId: uid,
        answers,
        // Waktu mulai dicatat di perangkat saat "Mulai Tes" ditekan; bila hilang, pakai waktu server saat kirim.
        startedAt: startedAtRef.current !== null ? Timestamp.fromMillis(startedAtRef.current) : serverTimestamp(),
        submittedAt: serverTimestamp(),
        hasSubmitted: true,
      });
      try {
        localStorage.removeItem(storageKey(uid));
      } catch {
        // Diabaikan.
      }
      setPhase("result");
    } catch (caughtError) {
      console.error(caughtError);
      setSubmitError("Jawaban gagal dikirim. Data tersimpan di perangkat ini; silakan coba kembali.");
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
        // Profil (nama) wajib ada. Gagal membaca tidak mengalihkan (fail open) agar error sementara tidak memblokir tes.
        try {
          const candidate = await getDoc(doc(db, "hexacoCandidates", currentUser.uid));
          if (!active) return;
          const nama = candidate.exists() ? candidate.data().nama : undefined;
          if (typeof nama !== "string" || !nama.trim()) {
            router.replace("/profile");
            return;
          }
        } catch (profileError) {
          console.error(profileError);
          if (!active) return;
        }

        const session = await getDoc(doc(db, "discSessions", currentUser.uid));
        if (!active) return;
        if (session.exists()) {
          router.replace("/thankyou");
          return;
        }

        const restored = readProgress(currentUser.uid);
        picksRef.current = restored.picks;
        startedAtRef.current = restored.startedAt;
        setUser(currentUser);
        setPicks(restored.picks);
        setIsChecking(false);
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setLoadError("Data tes belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.");
        setIsChecking(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  // Dialog konfirmasi: fokus ke tombol kirim saat dibuka, Escape untuk menutup.
  useEffect(() => {
    if (!isConfirming) return;
    confirmButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsConfirming(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isConfirming]);

  function startTest() {
    // Waktu mulai dari cadangan (muat ulang) dipertahankan; cadangan sendiri baru dibuat saat jawaban pertama dipilih.
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    setPhase("test");
  }

  // Memilih pernyataan yang sama lagi membatalkan pilihan. Memilih pernyataan yang sudah menjadi pilihan di
  // kolom lain memindahkannya: pilihan lama di kolom lain dikosongkan (M dan L tidak boleh sama).
  function selectStatement(groupIndex: number, column: Column, statement: DiscStatementNo) {
    if (!user) return;
    const other: Column = column === "m" ? "l" : "m";
    const current = picksRef.current[groupIndex];
    const updated: DiscPick = { ...current, [column]: current[column] === statement ? null : statement };
    if (updated[column] !== null && updated[other] === statement) updated[other] = null;
    const next = picksRef.current.map((pick, index) => (index === groupIndex ? updated : pick));
    picksRef.current = next;
    setPicks(next);
    saveProgress(user.uid, next, startedAtRef.current);
  }

  function confirmSubmit() {
    if (!user || !picksRef.current.every(isComplete)) return;
    setIsConfirming(false);
    void submit(picksRef.current, user.uid);
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

  if (phase === "result") {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Tes selesai. Terima kasih.</h1>
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
            <button type="button" onClick={() => user && void submit(picksRef.current, user.uid)} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#bf4821]">Kirim Ulang</button>
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
          <Mascot id="disc" className="w-44 sm:w-52 lg:w-80" />
          <section className="w-full max-w-md text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-primary">{PAGE_TITLE}</h1>
            <div className="mt-6 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
              <p>
                Setiap kelompok berisi 4 pernyataan. Pilih satu pernyataan yang PALING menggambarkan diri Anda pada kolom M, dan satu
                pernyataan yang PALING TIDAK menggambarkan diri Anda pada kolom L. Setiap kelompok wajib diisi M dan L, dan keduanya
                tidak boleh pada pernyataan yang sama. Tidak ada jawaban benar atau salah, dan tidak ada batas waktu.
              </p>
            </div>
            <button type="button" onClick={startTest} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai Tes</button>
          </section>
        </div>
      </main>
    );
  }

  const completeCount = picks.filter(isComplete).length;
  const allComplete = completeCount === TOTAL;

  return (
    <main className="pb-28">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-primary">{PAGE_TITLE}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pada setiap kelompok, pilih satu pernyataan pada kolom <span className="font-bold text-primary">M</span> (paling menggambarkan diri Anda) dan satu pada kolom <span className="font-bold text-accent">L</span> (paling tidak menggambarkan diri Anda).
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {DISC_GROUPS.map((group, groupIndex) => {
            const pick = picks[groupIndex];
            const complete = isComplete(pick);
            return (
              <article key={group.no} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby={`disc-group-${group.no}`}>
                <div className="flex items-center justify-between gap-3">
                  <p id={`disc-group-${group.no}`} className="text-xs font-bold text-slate-400">Kelompok {group.no}</p>
                  <p className={`text-xs font-semibold ${complete ? "text-emerald-700" : "text-slate-400"}`}>
                    {complete ? "Lengkap" : pick.m === null && pick.l === null ? "Belum diisi" : `Pilih ${pick.m === null ? "M" : "L"}`}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-x-3 gap-y-2">
                  <p className="text-center text-xs font-bold text-primary" aria-hidden="true">M</p>
                  <span aria-hidden="true" />
                  <p className="text-center text-xs font-bold text-accent" aria-hidden="true">L</p>

                  {STATEMENT_NOS.map((statement) => {
                    const text = group.statements[statement - 1];
                    const isM = pick.m === statement;
                    const isL = pick.l === statement;
                    return (
                      <div key={statement} className="contents">
                        <button
                          type="button"
                          aria-pressed={isM}
                          aria-label={`M — paling menggambarkan: ${text}`}
                          onClick={() => selectStatement(groupIndex, "m", statement)}
                          className={`grid h-11 w-11 place-items-center rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${isM ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-transparent hover:border-primary hover:bg-blue-50"}`}
                        >
                          M
                        </button>
                        <p className={`text-sm leading-5 ${isM || isL ? "font-semibold text-slate-900" : "text-slate-700"}`}>{text}</p>
                        <button
                          type="button"
                          aria-pressed={isL}
                          aria-label={`L — paling tidak menggambarkan: ${text}`}
                          onClick={() => selectStatement(groupIndex, "l", statement)}
                          className={`grid h-11 w-11 place-items-center rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-orange-100 ${isL ? "border-accent bg-accent text-white" : "border-slate-300 bg-white text-transparent hover:border-accent hover:bg-orange-50"}`}
                        >
                          L
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">{completeCount} / {TOTAL} kelompok terisi</p>
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              disabled={!allComplete}
              className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#bf4821] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200"
            >
              Kirim Jawaban
            </button>
          </div>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-900/40 px-5" onClick={() => setIsConfirming(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disc-confirm-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(6,59,130,.18)] sm:p-7"
          >
            <h2 id="disc-confirm-title" className="text-lg font-bold text-primary">Kirim jawaban?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Semua {TOTAL} kelompok sudah terisi. Jawaban tidak dapat diubah setelah dikirim.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsConfirming(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Periksa Lagi</button>
              <button ref={confirmButtonRef} type="button" onClick={confirmSubmit} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-100">Ya, Kirim</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
