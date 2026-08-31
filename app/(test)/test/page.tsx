"use client";

import { auth, db } from "@/lib/firebase";
import { calculateAll } from "@/lib/hexaco/calculator";
import { HEXACO_QUESTIONS } from "@/lib/hexaco/questions";
import type { Response } from "@/lib/types/hexaco";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 10;
const TOTAL_PAGES = 10;
const choices = [
  { value: 1, label: "Sangat Tidak Setuju" },
  { value: 2, label: "Tidak Setuju" },
  { value: 3, label: "Netral" },
  { value: 4, label: "Setuju" },
  { value: 5, label: "Sangat Setuju" },
];

interface CandidateData {
  nama: string;
  pendidikan: string;
  tanggalLahir: string;
  hasSubmitted?: boolean;
}

export default function TestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [responses, setResponses] = useState<Response>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "hexacoCandidates", currentUser.uid));
        if (!active) return;
        if (snapshot.exists() && snapshot.data().hasSubmitted === true) {
          router.replace("/thankyou");
          return;
        }
        const data = snapshot.exists() ? snapshot.data() : null;
        if (!data || typeof data.nama !== "string" || !data.nama.trim()) {
          router.replace("/profile");
          return;
        }

        const storageKey = `hexacoResponses:${currentUser.uid}`;
        const backup = localStorage.getItem(storageKey);
        if (backup) {
          try {
            const parsed = JSON.parse(backup) as Response;
            const valid = Object.fromEntries(Object.entries(parsed).filter(([id, value]) => Number(id) >= 1 && Number(id) <= 100 && Number.isInteger(value) && value >= 1 && value <= 5));
            setResponses(valid);
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
        setUser(currentUser);
        setCandidate({ nama: data.nama, pendidikan: data.pendidikan, tanggalLahir: data.tanggalLahir, hasSubmitted: data.hasSubmitted });
        setIsChecking(false);
      } catch {
        if (!active) return;
        setError("Data tes belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.");
        setIsChecking(false);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [router]);

  const pageQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return HEXACO_QUESTIONS.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage]);

  const answeredCount = Object.keys(responses).length;
  const pageComplete = pageQuestions.every((question) => responses[question.id] !== undefined);
  const startNumber = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endNumber = currentPage * ITEMS_PER_PAGE;

  function selectResponse(questionId: number, value: number) {
    if (!user) return;
    const next = { ...responses, [questionId]: value };
    setResponses(next);
    localStorage.setItem(`hexacoResponses:${user.uid}`, JSON.stringify(next));
  }

  function changePage(page: number) {
    setCurrentPage(page);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitTest() {
    if (!user || !candidate) return;
    if (HEXACO_QUESTIONS.some((question) => responses[question.id] === undefined)) {
      setError("Pastikan seluruh 100 soal telah dijawab sebelum mengirim tes.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const scores = calculateAll(responses);
      const sessionRef = doc(collection(db, "hexacoSessions"));
      const candidateRef = doc(db, "hexacoCandidates", user.uid);
      const batch = writeBatch(db);
      batch.set(sessionRef, {
        candidateId: user.uid,
        email: user.email,
        nama: candidate.nama,
        pendidikan: candidate.pendidikan,
        tanggalLahir: candidate.tanggalLahir,
        responses,
        scores,
        submittedAt: serverTimestamp(),
        status: "completed",
      });
      batch.update(candidateRef, { hasSubmitted: true, sessionId: sessionRef.id });
      await batch.commit();
      localStorage.removeItem(`hexacoResponses:${user.uid}`);
      router.replace("/thankyou");
    } catch {
      setError("Jawaban gagal dikirim. Data sementara tetap tersimpan; silakan coba kembali.");
      setIsSubmitting(false);
    }
  }

  if (isChecking) return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5"><p className="text-sm font-medium text-slate-500">Menyiapkan tes...</p></main>;
  if (!user || !candidate) return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5"><p className="max-w-md text-center text-sm text-red-700">{error || "Mengalihkan halaman..."}</p></main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold text-primary">Halaman {currentPage} dari {TOTAL_PAGES} <span className="font-medium text-slate-500">(soal {startNumber}–{endNumber})</span></p><p className="mt-1 text-sm text-slate-600">{answeredCount} dari 100 soal terjawab</p></div>
          <span className="text-sm font-semibold text-accent">{answeredCount}% lengkap</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${answeredCount}%` }} /></div>
      </section>

      <div className="mt-6 space-y-4">
        {pageQuestions.map((question) => (
          <article key={question.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-primary">{question.id}</span><p className="pt-0.5 font-medium leading-7 text-slate-800">{question.text}</p></div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5">
              {choices.map((choice) => {
                const selected = responses[question.id] === choice.value;
                return <button key={choice.value} type="button" onClick={() => selectResponse(question.id, choice.value)} aria-pressed={selected} className={`min-h-16 rounded-xl border px-3 py-2 text-center text-xs font-semibold leading-4 transition ${selected ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}><span className="mb-1 block text-base font-bold">{choice.value}</span>{choice.label}</button>;
              })}
            </div>
          </article>
        ))}
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <nav className="mt-8 flex items-center justify-between gap-4">
        {currentPage > 1 ? <button type="button" onClick={() => changePage(currentPage - 1)} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeftIcon className="h-5 w-5" />Sebelumnya</button> : <span />}
        {currentPage < TOTAL_PAGES ? <button type="button" disabled={!pageComplete} onClick={() => changePage(currentPage + 1)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Selanjutnya<ArrowRightIcon className="h-5 w-5" /></button> : <button type="button" disabled={!pageComplete || isSubmitting} onClick={submitTest} className="rounded-xl bg-accent px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSubmitting ? "Mengirim..." : "Submit"}</button>}
      </nav>
      <p className="mt-7 text-center text-xs text-slate-500">Jawaban sementara tersimpan otomatis di perangkat ini.</p>
    </main>
  );
}
