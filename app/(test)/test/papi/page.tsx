"use client";

import { auth, db } from "@/lib/firebase";
import { PAPI_QUESTIONS } from "@/lib/papi/questions";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Mascot from "../../Mascot";
import { subTestLabel } from "../../subtests";

const PAGE_TITLE = subTestLabel("papi");

type Phase = "intro" | "test" | "result";

const TOTAL = PAPI_QUESTIONS.length;
const storageKey = (uid: string) => `papiProgress:${uid}`;
const emptyAnswers = () => Array<string | null>(TOTAL).fill(null);

// Hanya array 90 slot berisi null/"a"/"b" yang dipulihkan; data lain dibuang dan tes mulai dari kosong.
function readProgress(uid: string): (string | null)[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return emptyAnswers();
    const parsed = JSON.parse(raw) as { answers?: unknown };
    if (Array.isArray(parsed.answers) && parsed.answers.length === TOTAL && parsed.answers.every((value) => value === null || value === "a" || value === "b")) {
      return parsed.answers as (string | null)[];
    }
    localStorage.removeItem(storageKey(uid));
  } catch {
    try {
      localStorage.removeItem(storageKey(uid));
    } catch {
      // Diabaikan.
    }
  }
  return emptyAnswers();
}

function saveProgress(uid: string, answers: (string | null)[]) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify({ answers }));
  } catch {
    // Cadangan lokal bersifat opsional.
  }
}

export default function PapiPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<(string | null)[]>(emptyAnswers);
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const answersRef = useRef<(string | null)[]>(emptyAnswers());

  const submit = useCallback(async (finalAnswers: (string | null)[], uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await setDoc(doc(db, "papiSessions", uid), {
        candidateId: uid,
        answers: finalAnswers,
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

        const session = await getDoc(doc(db, "papiSessions", currentUser.uid));
        if (!active) return;
        if (session.exists()) {
          router.replace("/thankyou");
          return;
        }

        const restored = readProgress(currentUser.uid);
        answersRef.current = restored;
        setUser(currentUser);
        setAnswers(restored);
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

  function selectAnswer(index: number, option: "a" | "b") {
    if (!user) return;
    const next = [...answersRef.current];
    next[index] = next[index] === option ? null : option;
    answersRef.current = next;
    setAnswers(next);
    setWarning("");
    saveProgress(user.uid, next);
  }

  function handleSubmit() {
    if (!user) return;
    const answeredCount = answersRef.current.filter((value) => value !== null).length;
    if (answeredCount < TOTAL) {
      setWarning(`Masih ada ${TOTAL - answeredCount} pertanyaan yang belum dijawab. Semua pertanyaan harus dijawab sebelum mengirim.`);
      return;
    }
    void submit(answersRef.current, user.uid);
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
        <div className="flex w-full max-w-4xl flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-14">
          <Mascot id="papi" className="w-44 sm:w-52 lg:w-80" />
          <section className="w-full max-w-md text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-primary">{PAGE_TITLE}</h1>
            <div className="mt-6 space-y-3 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
              <p>Terdapat 90 pasang pernyataan. Pilih satu pernyataan (A atau B) yang paling mencerminkan diri Anda.</p>
              <p>Tidak ada jawaban benar atau salah.</p>
              <p>Tidak ada batas waktu.</p>
              <p>Semua pertanyaan harus dijawab.</p>
            </div>
            <button type="button" onClick={() => setPhase("test")} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai Tes</button>
          </section>
        </div>
      </main>
    );
  }

  const answeredCount = answers.filter((value) => value !== null).length;
  const allAnswered = answeredCount === TOTAL;

  return (
    <main className="pb-28">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-primary">{PAGE_TITLE}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">Pilih pernyataan A atau B yang paling mencerminkan diri Anda pada setiap nomor.</p>
        </div>

        <div className="mt-4 space-y-3">
          {PAPI_QUESTIONS.map((question, index) => {
            const selected = answers[index];
            return (
              <article key={question.id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-bold text-slate-400">Soal {question.id}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={selected === "a"}
                    onClick={() => selectAnswer(index, "a")}
                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium leading-5 transition ${selected === "a" ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${selected === "a" ? "bg-white text-primary" : "bg-blue-50 text-primary"}`}>A</span>
                    {question.a}
                  </button>
                  <button
                    type="button"
                    aria-pressed={selected === "b"}
                    onClick={() => selectAnswer(index, "b")}
                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium leading-5 transition ${selected === "b" ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${selected === "b" ? "bg-white text-primary" : "bg-blue-50 text-primary"}`}>B</span>
                    {question.b}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {warning && <p role="alert" className="mb-2 text-xs font-semibold text-red-700">{warning}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600">{answeredCount} dari {TOTAL} pertanyaan dijawab</p>
            {/* Tombol tetap dapat ditekan meski belum lengkap, agar peringatan di atas bisa muncul saat ditekan;
                tampilan mengikuti status "aktif hanya bila semua terjawab". */}
            <button
              type="button"
              onClick={handleSubmit}
              aria-disabled={!allAnswered}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${allAnswered ? "bg-accent hover:bg-[#bf4821]" : "bg-slate-200 text-slate-400 hover:bg-slate-200"}`}
            >
              Kirim Jawaban
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
