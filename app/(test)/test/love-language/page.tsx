"use client";

import { auth, db } from "@/lib/firebase";
import { LOVE_LANGUAGE_ITEMS, LOVE_LANGUAGE_TOTAL_ITEMS } from "@/lib/love-language/love-language-questions";
import type { LoveLanguageLetter } from "@/lib/types/love-language";
import { CheckIcon } from "@heroicons/react/24/solid";
import { User, onAuthStateChanged } from "firebase/auth";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Mascot from "../../Mascot";
import { subTestLabel } from "../../subtests";

const PAGE_TITLE = subTestLabel("love-language");

type Phase = "intro" | "test" | "result";

// Indeks pernyataan yang dipilih pada satu nomor (0 = atas, 1 = bawah); null = belum dijawab.
type Pick = 0 | 1 | null;

const TOTAL = LOVE_LANGUAGE_TOTAL_ITEMS;
const OPTION_INDEXES = [0, 1] as const;
const storageKey = (uid: string) => `loveLanguageProgress:${uid}`;
const emptyPicks = (): Pick[] => Array.from({ length: TOTAL }, () => null);
const isPick = (value: unknown): value is Pick => value === null || value === 0 || value === 1;

// Hanya 30 jawaban bernilai null/0/1 yang dipulihkan; data lain dibuang dan tes mulai dari kosong.
// startedAt = waktu kandidat menekan "Mulai Tes" (ms), null bila tidak ada / tidak valid.
function readProgress(uid: string): { picks: Pick[]; startedAt: number | null } {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return { picks: emptyPicks(), startedAt: null };
    const parsed = JSON.parse(raw) as { answers?: unknown; startedAt?: unknown };
    if (Array.isArray(parsed.answers) && parsed.answers.length === TOTAL && parsed.answers.every(isPick)) {
      const startedAt = typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt) && parsed.startedAt <= Date.now() ? parsed.startedAt : null;
      return { picks: parsed.answers as Pick[], startedAt };
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

function saveProgress(uid: string, picks: Pick[], startedAt: number | null) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify({ answers: picks, startedAt }));
  } catch {
    // Cadangan lokal bersifat opsional.
  }
}

export default function LoveLanguagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [picks, setPicks] = useState<Pick[]>(emptyPicks);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const picksRef = useRef<Pick[]>(emptyPicks());
  const startedAtRef = useRef<number | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const submit = useCallback(async (finalPicks: Pick[], uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Hanya dipanggil bila semua nomor terjawab; yang disimpan adalah huruf kategori pernyataan yang dipilih.
      const answers: LoveLanguageLetter[] = finalPicks.map((pick, index) => LOVE_LANGUAGE_ITEMS[index].options[pick as 0 | 1].letter);
      await setDoc(doc(db, "loveLanguageSessions", uid), {
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

        const session = await getDoc(doc(db, "loveLanguageSessions", currentUser.uid));
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

  // Pilihan tunggal: memilih pernyataan lain memindahkan pilihan; memilih yang sama tidak membatalkannya.
  function selectOption(itemIndex: number, option: 0 | 1) {
    if (!user || picksRef.current[itemIndex] === option) return;
    const next = picksRef.current.map((pick, index) => (index === itemIndex ? option : pick));
    picksRef.current = next;
    setPicks(next);
    saveProgress(user.uid, next, startedAtRef.current);
  }

  function confirmSubmit() {
    if (!user || picksRef.current.some((pick) => pick === null)) return;
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
          <Mascot id="love-language" className="w-44 sm:w-52 lg:w-80" />
          <section className="w-full max-w-md text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-primary">{PAGE_TITLE}</h1>
            <div className="mt-6 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
              <p>
                Tidak ada jawaban yang benar atau salah. Pada setiap nomor, pilih satu pernyataan yang paling mencerminkan diri Anda.
                Setiap nomor wajib dijawab, dan tidak ada batas waktu.
              </p>
            </div>
            <button type="button" onClick={startTest} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai Tes</button>
          </section>
        </div>
      </main>
    );
  }

  const answeredCount = picks.filter((pick) => pick !== null).length;
  const allAnswered = answeredCount === TOTAL;

  return (
    <main className="pb-28">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-primary">{PAGE_TITLE}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pada setiap nomor, pilih satu pernyataan yang paling mencerminkan diri Anda.</p>
        </div>

        <div className="mt-4 space-y-3">
          {LOVE_LANGUAGE_ITEMS.map((item, itemIndex) => {
            const pick = picks[itemIndex];
            return (
              <article key={item.no} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p id={`love-language-item-${item.no}`} className="text-xs font-bold text-slate-400">Nomor {item.no}</p>
                  <p className={`text-xs font-semibold ${pick !== null ? "text-emerald-700" : "text-slate-400"}`}>{pick !== null ? "Terjawab" : "Belum dijawab"}</p>
                </div>

                <div role="radiogroup" aria-labelledby={`love-language-item-${item.no}`} className="mt-3 space-y-2">
                  {OPTION_INDEXES.map((optionIndex) => {
                    const selected = pick === optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => selectOption(itemIndex, optionIndex)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${selected ? "border-primary bg-blue-50" : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50"}`}
                      >
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"}`} aria-hidden="true">
                          {selected && <CheckIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span className={`text-sm leading-5 ${selected ? "font-semibold text-slate-900" : "text-slate-700"}`}>{item.options[optionIndex].text}</span>
                      </button>
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
            <p className="text-sm font-semibold text-slate-600">{answeredCount} / {TOTAL} terjawab</p>
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              disabled={!allAnswered}
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
            aria-labelledby="love-language-confirm-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(6,59,130,.18)] sm:p-7"
          >
            <h2 id="love-language-confirm-title" className="text-lg font-bold text-primary">Kirim jawaban?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Semua {TOTAL} nomor sudah terjawab. Jawaban tidak dapat diubah setelah dikirim.</p>
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
