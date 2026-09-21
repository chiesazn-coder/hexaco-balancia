"use client";

import { auth, db } from "@/lib/firebase";
import { GRID } from "@/lib/kraepelin/grid";
import { KraepelinScore, scoreKraepelin } from "@/lib/kraepelin/scorer";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type State = "intro" | "countdown" | "test" | "result";

const TOTAL_COLUMNS = GRID.length;
const SLOTS = GRID[0].length - 1;
const TIME_LIMIT = 15;
const WARNING_AT = 5;
const COUNTDOWN_FROM = 3;

const emptyColumn = () => Array<string>(SLOTS).fill("");
const storageKey = (uid: string) => `kraepelinProgress:${uid}`;

// Hanya kolom yang sudah selesai yang dipulihkan; data rusak dibuang dan tes mulai dari kolom 1.
function readProgress(uid: string): string[][] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { colIdx?: unknown; columns?: unknown };
    if (typeof parsed.colIdx === "number" && Array.isArray(parsed.columns)) {
      const columns = parsed.columns.slice(0, parsed.colIdx);
      const valid = columns.length === parsed.colIdx
        && columns.length <= TOTAL_COLUMNS
        && columns.every((column) => Array.isArray(column) && column.length === SLOTS && column.every((value) => typeof value === "string" && /^[0-9]?$/.test(value)));
      if (valid) return columns as string[][];
    }
    localStorage.removeItem(storageKey(uid));
  } catch {
    // localStorage tidak tersedia atau JSON rusak: mulai dari awal.
  }
  return [];
}

function saveProgress(uid: string, columns: string[][]) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify({ colIdx: columns.length, columns }));
  } catch {
    // Cadangan lokal bersifat opsional.
  }
}

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submit = useCallback(async (allColumns: string[][], uid: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const score = scoreKraepelin(allColumns, GRID);
      await setDoc(doc(db, "kraepelinSessions", uid), {
        candidateId: uid,
        // Firestore menolak array bersarang (string[][]), jadi tiap kolom dibungkus map: answers[i].values.
        answers: allColumns.map((values) => ({ values })),
        ...score,
        submittedAt: serverTimestamp(),
        hasSubmitted: true,
      });
      try {
        localStorage.removeItem(storageKey(uid));
      } catch {
        // Diabaikan.
      }
      setResult(score);
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
        // Profil (nama) wajib ada agar dashboard punya nama untuk ditampilkan. Gagal membaca tidak
        // mengalihkan (fail open) supaya error Firestore sementara tidak memblokir tes.
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

        const session = await getDoc(doc(db, "kraepelinSessions", currentUser.uid));
        if (!active) return;
        if (session.exists()) {
          router.replace("/thankyou");
          return;
        }

        const restored = readProgress(currentUser.uid);
        setUser(currentUser);
        setColumns(restored);
        setColIdx(restored.length);
        // Mulai baru: tampilkan intro. Kandidat yang kembali (ada progres tersimpan) sudah pernah melihatnya.
        setPhase(restored.length === 0 ? "intro" : "countdown");
        setIsChecking(false);
        // Ke-50 kolom sudah selesai tetapi pengiriman sebelumnya gagal: kirim ulang.
        if (restored.length >= TOTAL_COLUMNS) void submit(restored, currentUser.uid);
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

  // Hitung mundur 3-2-1 sebelum tiap kolom.
  useEffect(() => {
    if (phase !== "countdown" || isChecking || colIdx >= TOTAL_COLUMNS) return;
    let remaining = COUNTDOWN_FROM;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(interval);
      setTimeLeft(TIME_LIMIT);
      setPhase("test");
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, colIdx, isChecking]);

  // Timer kolom. Sisa waktu dihitung dari tenggat (bukan dikurangi 1 tiap tick) agar tab yang
  // di-throttle browser tidak memperpanjang waktu pengerjaan.
  useEffect(() => {
    if (phase !== "test" || isChecking || !user || colIdx >= TOTAL_COLUMNS) return;
    const deadline = Date.now() + TIME_LIMIT * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining > 0) return;

      clearInterval(interval);
      const nextColumns = [...columns, currentRef.current];
      saveProgress(user.uid, nextColumns);
      setColumns(nextColumns);
      setColIdx(nextColumns.length);
      currentRef.current = emptyColumn();
      setCurrent(currentRef.current);
      if (nextColumns.length >= TOTAL_COLUMNS) {
        void submit(nextColumns, user.uid);
        return;
      }
      setCountdown(COUNTDOWN_FROM);
      setPhase("countdown");
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, colIdx, columns, isChecking, user, submit]);

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
    if (timeLeft <= 0) return;
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...currentRef.current];
    next[slot] = digit;
    currentRef.current = next;
    setCurrent(next);

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
        <section className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tes Penjumlahan</h1>
          <div className="mt-6 space-y-3 rounded-3xl bg-white p-7 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-8">
            <p>Kamu akan melihat deretan angka dalam kolom.</p>
            <p>Jumlahkan dua angka yang berdekatan, lalu tulis digit terakhir dari hasilnya.</p>
            <p className="rounded-xl bg-blue-50 px-4 py-2.5 font-semibold text-primary">Contoh: 7 + 6 = 13 → tulis 3</p>
            <p>Setiap kolom berlangsung selama 15 detik.</p>
            <p>Kerjakan dari atas ke bawah, secepat mungkin.</p>
          </div>
          <button type="button" onClick={() => setPhase("countdown")} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-[#052f68] focus:outline-none focus:ring-4 focus:ring-blue-100">Mulai tes</button>
        </section>
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
