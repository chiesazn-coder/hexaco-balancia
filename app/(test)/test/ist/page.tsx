"use client";

import { auth, db } from "@/lib/firebase";
import { ME_WORDS, type OptionKey } from "@/lib/ist/questions";
import { scoreIst, type IstAnswers } from "@/lib/ist/scorer";
import { IST_SUBTESTS, createEmptyAnswers, type IstSubtest } from "@/lib/ist/subtests";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "intro" | "countdown" | "subtest" | "me_memorize" | "result";

const COUNTDOWN_SECONDS = 5;
const WARNING_SECONDS = 30;
const SUBTEST_COUNT = IST_SUBTESTS.length;
const OPTION_KEYS: OptionKey[] = ["a", "b", "c", "d", "e"];

const storageKey = (uid: string) => `istProgress:${uid}`;
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// FA: gambar pilihan jawaban tergantung imageSet soal; gambar soal tergantung rentang id.
const FA_ANSWER_IMAGE: Record<1 | 2, string> = { 1: "/ist/fa-set1.png", 2: "/ist/fa-set2.png" };
function faQuestionImage(id: number): string {
  if (id <= 120) return "/ist/fa-117-120.png";
  if (id <= 124) return "/ist/fa-121-124.png";
  if (id <= 128) return "/ist/fa-125-128.png";
  if (id <= 132) return "/ist/fa-129-132.png";
  return "/ist/fa-133-136.png";
}

// WU: satu gambar referensi tetap, gambar soal tergantung rentang id.
const WU_REFERENCE_IMAGE = "/ist/wu-ref.png";
function wuQuestionImage(id: number): string {
  if (id <= 141) return "/ist/wu-137-141.png";
  if (id <= 146) return "/ist/wu-142-146.png";
  if (id <= 151) return "/ist/wu-147-151.png";
  return "/ist/wu-152-156.png";
}

// Pola jawaban yang valid per jenis bagian, dipakai saat memulihkan cadangan localStorage.
function isValidAnswer(kind: IstSubtest["kind"], value: string): boolean {
  switch (kind) {
    case "choice":
    case "image-fa":
    case "image-wu":
      return /^[a-e]$/.test(value);
    case "sequence":
      return /^[0-9]{1,4}$/.test(value);
    case "word-problem":
      return /^[0-9]{1,6}$/.test(value);
    case "text":
      return value.length >= 1 && value.length <= 100;
    default:
      return false;
  }
}

// Lama satu fase: fase hafal (bagian dengan memorizeSeconds, mis. ME) atau fase mengerjakan soal.
function phaseSeconds(index: number, memorize: boolean): number {
  const subtest = IST_SUBTESTS[index];
  return memorize && subtest.kind === "choice" && subtest.memorizeSeconds ? subtest.memorizeSeconds : subtest.durationSeconds;
}

// currentSubtest = indeks bagian yang akan/sedang dikerjakan; SUBTEST_COUNT = semua bagian selesai, tinggal dikirim.
function readProgress(uid: string): { currentSubtest: number; answers: IstAnswers } | null {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { currentSubtest?: unknown; answers?: Record<string, unknown> };
    if (typeof parsed.currentSubtest === "number" && Number.isInteger(parsed.currentSubtest) && parsed.currentSubtest >= 0 && parsed.currentSubtest <= SUBTEST_COUNT && parsed.answers) {
      const answers = createEmptyAnswers();
      const valid = IST_SUBTESTS.every((subtest) => {
        const saved = parsed.answers?.[subtest.key];
        if (!Array.isArray(saved) || saved.length !== subtest.questions.length) return false;
        if (!saved.every((value) => value === null || (typeof value === "string" && isValidAnswer(subtest.kind, value)))) return false;
        answers[subtest.key] = saved as (string | null)[];
        return true;
      });
      if (valid) return { currentSubtest: parsed.currentSubtest, answers };
    }
    localStorage.removeItem(storageKey(uid));
  } catch {
    // JSON rusak atau localStorage tidak tersedia: buang cadangan (agar test-hub tidak menganggap tes sedang
    // dikerjakan) dan mulai dari awal.
    try {
      localStorage.removeItem(storageKey(uid));
    } catch {
      // Diabaikan.
    }
  }
  return null;
}

function saveProgress(uid: string, currentSubtest: number, answers: IstAnswers) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify({ currentSubtest, answers }));
  } catch {
    // Cadangan lokal bersifat opsional.
  }
}

export default function IstPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [subIdx, setSubIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<IstAnswers>(createEmptyAnswers);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Salinan jawaban terbaru untuk callback timer; ref fungsi agar interval selalu memanggil versi terbaru.
  const answersRef = useRef<IstAnswers>(createEmptyAnswers());
  const focusInputRef = useRef<HTMLInputElement | null>(null);
  const timeUpRef = useRef<() => void>(() => {});
  const beginRef = useRef<(index: number) => void>(() => {});

  const submit = useCallback(async (finalAnswers: IstAnswers, uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const { scores } = scoreIst(finalAnswers);
      await setDoc(doc(db, "istSessions", uid), {
        candidateId: uid,
        answers: finalAnswers,
        scores,
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

        const session = await getDoc(doc(db, "istSessions", currentUser.uid));
        if (!active) return;
        if (session.exists()) {
          router.replace("/thankyou");
          return;
        }

        const restored = readProgress(currentUser.uid);
        setUser(currentUser);
        if (!restored) {
          setPhase("intro");
          setIsChecking(false);
          return;
        }

        answersRef.current = restored.answers;
        setAnswers(restored.answers);
        setSubIdx(Math.min(restored.currentSubtest, SUBTEST_COUNT - 1));
        setIsChecking(false);
        if (restored.currentSubtest >= SUBTEST_COUNT) {
          // Semua bagian sudah selesai tetapi pengiriman sebelumnya gagal: kirim ulang.
          setIsFinished(true);
          void submit(restored.answers, currentUser.uid);
          return;
        }
        // Kembali ke bagian yang sedang berjalan dengan timer baru (jawaban yang tersimpan dipertahankan).
        setPhase("countdown");
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
  }, [router, submit]);

  function beginSubtest(index: number) {
    const target = IST_SUBTESTS[index];
    const hasMemorize = target.kind === "choice" && !!target.memorizeSeconds;
    setSubIdx(index);
    setQIdx(0);
    setTimeLeft(phaseSeconds(index, hasMemorize));
    setPhase(hasMemorize ? "me_memorize" : "subtest");
  }

  function finishSubtest() {
    if (!user || isFinished) return;
    const next = subIdx + 1;
    saveProgress(user.uid, next, answersRef.current);
    if (next >= SUBTEST_COUNT) {
      setIsFinished(true);
      void submit(answersRef.current, user.uid);
      return;
    }
    setSubIdx(next);
    setQIdx(0);
    setPhase("countdown");
  }

  function handleTimeUp() {
    if (phase === "me_memorize") {
      // Fase hafal selesai: lanjut ke soal bagian yang sama dengan timer baru.
      setQIdx(0);
      setTimeLeft(phaseSeconds(subIdx, false));
      setPhase("subtest");
      return;
    }
    finishSubtest();
  }

  useEffect(() => {
    beginRef.current = beginSubtest;
    timeUpRef.current = handleTimeUp;
  });

  // Hitung mundur antar bagian.
  useEffect(() => {
    if (phase !== "countdown" || isChecking) return;
    let remaining = COUNTDOWN_SECONDS;
    setCountdown(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(interval);
      beginRef.current(subIdx);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, subIdx, isChecking]);

  // Timer fase hafal dan fase soal. Sisa waktu dihitung dari tenggat agar tab yang di-throttle browser
  // tidak memperpanjang waktu.
  useEffect(() => {
    if ((phase !== "subtest" && phase !== "me_memorize") || isChecking || isFinished) return;
    const deadline = Date.now() + phaseSeconds(subIdx, phase === "me_memorize") * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining > 0) return;
      clearInterval(interval);
      timeUpRef.current();
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, subIdx, isChecking, isFinished]);

  useEffect(() => {
    if (phase === "subtest") focusInputRef.current?.focus();
  }, [phase, subIdx, qIdx]);

  useEffect(() => {
    if (phase !== "result") return;
    const timeout = setTimeout(() => router.push("/thankyou"), 3000);
    return () => clearTimeout(timeout);
  }, [phase, router]);

  function updateAnswer(value: string | null) {
    if (!user || timeLeft <= 0) return;
    const key = IST_SUBTESTS[subIdx].key;
    const list = [...answersRef.current[key]];
    list[qIdx] = value;
    const next = { ...answersRef.current, [key]: list };
    answersRef.current = next;
    setAnswers(next);
    saveProgress(user.uid, subIdx, next);
  }

  function startTest() {
    if (!user) return;
    // Simpan segera agar test-hub mendeteksi tes ini sedang dikerjakan.
    saveProgress(user.uid, 0, answersRef.current);
    beginSubtest(0);
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
            <button type="button" onClick={() => user && void submit(answersRef.current, user.uid)} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#bf4821]">Kirim Ulang</button>
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
        <section className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tes IST</h1>
          <div className="mt-6 space-y-3 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
            <p>Terdiri dari {SUBTEST_COUNT} bagian tes. Setiap bagian memiliki waktu yang berbeda. Kerjakan setiap soal sesuai petunjuk yang diberikan.</p>
            <ul className="space-y-1 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold text-primary">
              {IST_SUBTESTS.map((subtest) => {
                const memorize = subtest.kind === "choice" ? subtest.memorizeSeconds ?? 0 : 0;
                const minutes = (subtest.durationSeconds + memorize) / 60;
                return <li key={subtest.key}>{subtest.name} — {minutes} menit{memorize ? ` (${memorize / 60} menit hafal + ${subtest.durationSeconds / 60} menit soal)` : ""}</li>;
              })}
            </ul>
          </div>
          <button type="button" onClick={startTest} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai Tes</button>
        </section>
      </main>
    );
  }

  const subtest = IST_SUBTESTS[subIdx];

  if (phase === "countdown") {
    return (
      <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5">
        <div className="text-center" aria-live="polite">
          <p className="text-sm font-medium text-slate-500">Bagian berikutnya: {subtest.name} — dimulai dalam</p>
          <p className="mt-4 text-8xl font-bold text-primary">{countdown}</p>
        </div>
      </main>
    );
  }

  const totalSeconds = phaseSeconds(subIdx, phase === "me_memorize");
  const topBar = (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-primary">Bagian {subIdx + 1} / {SUBTEST_COUNT}</span>
          <span className="truncate text-sm font-semibold text-slate-600">{subtest.name}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= WARNING_SECONDS ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${(timeLeft / totalSeconds) * 100}%` }} />
          </div>
          <span className={`w-12 text-right text-sm font-bold tabular-nums ${timeLeft <= WARNING_SECONDS ? "text-red-600" : "text-slate-700"}`}>{formatTime(timeLeft)}</span>
        </div>
      </div>
    </div>
  );

  if (phase === "me_memorize") {
    return (
      <main>
        {topBar}
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-bold tracking-tight text-primary">Hafalkan kata-kata berikut</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Daftar akan hilang saat waktu habis. Setelah itu Anda akan menjawab pertanyaan tentang kata-kata ini.</p>
            <dl className="mt-6 space-y-3">
              {ME_WORDS.map((group) => (
                <div key={group.category} className="rounded-xl bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-bold tracking-widest text-slate-500">{group.category}</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-800">{group.words.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </main>
    );
  }

  const questionCount = subtest.questions.length;
  const current = answers[subtest.key][qIdx];
  const isLast = qIdx === questionCount - 1;
  const locked = timeLeft <= 0;

  const choiceQuestion = subtest.kind === "choice" ? subtest.questions[qIdx] : null;
  const zrQuestion = subtest.kind === "sequence" ? subtest.questions[qIdx] : null;
  const geQuestion = subtest.kind === "text" ? subtest.questions[qIdx] : null;
  const raQuestion = subtest.kind === "word-problem" ? subtest.questions[qIdx] : null;
  const faQuestion = subtest.kind === "image-fa" ? subtest.questions[qIdx] : null;
  const wuQuestion = subtest.kind === "image-wu" ? subtest.questions[qIdx] : null;
  const prompt = choiceQuestion
    ? choiceQuestion.text ?? (choiceQuestion.letter ? `Kata yang berawalan huruf ${choiceQuestion.letter} termasuk golongan …` : "Pilih kata yang tidak termasuk kelompok:")
    : null;

  // Tombol pilihan A–E untuk FA/WU (tanpa teks, hanya berbasis gambar di atasnya).
  const imageOptionButtons = (
    <div className="mt-5 grid grid-cols-5 gap-2">
      {OPTION_KEYS.map((key) => {
        const selected = current === key;
        return (
          <button
            key={key}
            type="button"
            disabled={locked}
            aria-pressed={selected}
            onClick={() => updateAnswer(selected ? null : key)}
            className={`grid h-14 place-items-center rounded-xl border text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
          >
            {key.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  return (
    <main>
      {topBar}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-primary">Soal {qIdx + 1} dari {questionCount}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtest.instruction}</p>

          {choiceQuestion && (
            <>
              <p className="mt-5 text-lg font-semibold leading-7 text-slate-800">{prompt}</p>
              <div className="mt-5 space-y-2">
                {OPTION_KEYS.map((key) => {
                  const selected = current === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={locked}
                      aria-pressed={selected}
                      onClick={() => updateAnswer(selected ? null : key)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${selected ? "bg-white text-primary" : "bg-blue-50 text-primary"}`}>{key.toUpperCase()}</span>
                      {choiceQuestion.options[key]}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {zrQuestion && (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {zrQuestion.sequence.map((value, index) => (
                  <span key={index} className="rounded-lg bg-blue-50 px-3 py-2 text-lg font-bold text-primary">{value}</span>
                ))}
                <span className="rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 text-lg font-bold text-slate-400">?</span>
              </div>
              <label htmlFor="zr-answer" className="mt-6 block text-sm font-semibold text-slate-700">Jawaban Anda</label>
              <input
                id="zr-answer"
                ref={focusInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                disabled={locked}
                value={current ?? ""}
                onChange={(event) => updateAnswer(event.target.value.replace(/\D/g, "").slice(0, 4) || null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isLast) setQIdx(qIdx + 1);
                }}
                className={`mt-2 h-12 w-40 rounded-xl border text-center text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${current ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white"}`}
              />
            </>
          )}

          {geQuestion && (
            <>
              <p className="mt-5 text-sm font-semibold text-slate-700">Temukan satu kata yang mencakup kedua kata berikut:</p>
              <p className="mt-2 text-lg font-bold text-slate-800">{geQuestion.wordA} — {geQuestion.wordB}</p>
              <label htmlFor="ge-answer" className="sr-only">Jawaban Anda</label>
              <input
                id="ge-answer"
                ref={focusInputRef}
                type="text"
                autoComplete="off"
                maxLength={100}
                placeholder="Ketik jawaban Anda"
                disabled={locked}
                value={current ?? ""}
                onChange={(event) => updateAnswer(event.target.value || null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isLast) setQIdx(qIdx + 1);
                }}
                className={`mt-4 w-full rounded-xl border px-4 py-3 text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${current ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white"}`}
              />
            </>
          )}

          {raQuestion && (
            <>
              <p className="mt-5 text-base leading-7 text-slate-800">{raQuestion.text}</p>
              <label htmlFor="ra-answer" className="mt-6 block text-sm font-semibold text-slate-700">Jawaban Anda</label>
              <input
                id="ra-answer"
                ref={focusInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="off"
                placeholder="Ketik jawaban"
                disabled={locked}
                value={current ?? ""}
                onChange={(event) => updateAnswer(event.target.value.replace(/\D/g, "").slice(0, 6) || null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isLast) setQIdx(qIdx + 1);
                }}
                className={`mt-2 h-12 w-40 rounded-xl border text-center text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${current ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-white"}`}
              />
            </>
          )}

          {faQuestion && (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Pilihan jawaban:</p>
              {/* Gambar tangkapan layar berukuran & rasio tidak seragam; next/image memerlukan dimensi tetap. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FA_ANSWER_IMAGE[faQuestion.imageSet]} alt={`Pilihan jawaban FA set ${faQuestion.imageSet}`} className="mt-2 w-full rounded-xl border border-slate-200" />
              <p className="mt-2 text-xs font-semibold text-accent">Perhatikan soal nomor {faQuestion.id}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faQuestionImage(faQuestion.id)} alt={`Soal FA nomor ${faQuestion.id}`} className="mt-2 w-full rounded-xl border border-slate-200" />
              <p className="mt-2 text-center text-xs text-slate-500">Susun potongan-potongan ini menjadi satu bentuk utuh</p>
              {imageOptionButtons}
            </>
          )}

          {wuQuestion && (
            <>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Kubus referensi (a–e):</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={WU_REFERENCE_IMAGE} alt="Kubus referensi" className="mt-2 w-full rounded-xl border border-slate-200" />
              <p className="mt-4 text-xs font-semibold text-accent">Perhatikan soal nomor {wuQuestion.id}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wuQuestionImage(wuQuestion.id)} alt={`Soal WU nomor ${wuQuestion.id}`} className="mt-2 w-full rounded-xl border border-slate-200" />
              <p className="mt-2 text-center text-xs text-slate-500">Kubus mana (a–e) yang sama dengan kubus di atas?</p>
              {imageOptionButtons}
            </>
          )}
        </div>

        <nav className="mt-6 flex items-center justify-between gap-3">
          <button type="button" disabled={qIdx === 0} onClick={() => setQIdx(qIdx - 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Soal sebelumnya</button>
          {isLast ? (
            <button type="button" onClick={finishSubtest} className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-[#bf4821]">Selesai bagian ini</button>
          ) : (
            <button type="button" onClick={() => setQIdx(qIdx + 1)} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-[#052f68]">Soal berikutnya</button>
          )}
        </nav>
      </div>
    </main>
  );
}
