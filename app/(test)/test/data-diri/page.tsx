"use client";

import { readBackup, restoreBackup, saveBackup, submitAnswers } from "@/lib/assessment/client";
import {
  WIZARD_STEPS,
  normalizePersonalData,
  personalDataIssues,
  prefillFromProfile,
  todayInJakarta,
  validPersonalDataBackup,
  type PersonalDataForm,
  type PersonalDataIssue,
} from "@/lib/assessment/personal-data";
import { isProfileComplete } from "@/lib/assessment/profile";
import { HOME_PATH } from "@/lib/assessment/progress";
import { isCompletedSession } from "@/lib/assessment/validation";
import { auth, db } from "@/lib/firebase";
import { guardRedirect } from "@/lib/navigation/guards";
import { wizardStepStates } from "@/lib/assessment/wizard-status";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import IdentitasStep from "./steps/IdentitasStep";
import KeluargaStep from "./steps/KeluargaStep";
import LainLainStep from "./steps/LainLainStep";
import { InternStep, MinatStep, SosialStep } from "./steps/MinatSosialInternStep";
import PendidikanStep from "./steps/PendidikanStep";
import { PekerjaanStep, ReferensiStep } from "./steps/PekerjaanReferensiStep";
import { SAVE_DATA_DIRI_DRAFT_EVENT } from "./events";
import { DATA_DIRI_COLUMNS, DATA_DIRI_WIDTH } from "./layout-width";
import { STEP_INFO, StepMobileNav, StepSidebar, type NavStatus } from "./StepNav";
import type { StepProps } from "./steps/types";

const STEP_COMPONENTS: ((props: StepProps) => ReactNode)[] = [
  IdentitasStep, KeluargaStep, PendidikanStep, PekerjaanStep, ReferensiStep, MinatStep, SosialStep, InternStep, LainLainStep,
];

type View = "checking" | "form" | "submitted" | "done";

// Draft tersimpan ({ step, form }) bila ada dan sah; email selalu mengikuti akun login dan tanggal pernyataan hari ini.
function initialDraft(uid: string, profile: Record<string, unknown> | undefined, email: string) {
  let step = 0;
  let form: PersonalDataForm = prefillFromProfile(profile, email);
  try {
    const raw = readBackup(uid, "data-diri");
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (validPersonalDataBackup(parsed)) ({ step, form } = parsed);
  } catch {
    // Cadangan rusak: mulai dari isian awal profil.
  }
  form = { ...form, identitas: { ...form.identitas, email }, pernyataan: { ...form.pernyataan, tanggal: todayInJakarta() } };
  return { step, form };
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <main className="grid min-h-[calc(100vh-65px)] place-items-center px-5 py-10">{children}</main>;
}

export default function DataDiriPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("checking");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<PersonalDataForm | null>(null);
  const [step, setStep] = useState(0);
  // Setelah "Kirim" pertama, daftar kesalahan dihitung ulang setiap kali isian berubah.
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Salinan terbaru untuk penyimpanan cadangan (onBlur/ganti langkah) tanpa menunggu render.
  const formRef = useRef<PersonalDataForm | null>(null);
  const stepRef = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace(guardRedirect("data-diri", { signedIn: false })!);
        return;
      }
      try {
        const profile = await getDocFromServer(doc(db, "hexacoCandidates", currentUser.uid));
        if (!active) return;
        const target = guardRedirect("data-diri", { signedIn: true, profileComplete: isProfileComplete(profile.data()) });
        if (target) {
          router.replace(target);
          return;
        }
        if (!currentUser.email) throw new Error("Akun ini tidak memiliki email. Silakan masuk dengan akun email atau Google.");
        const existing = await getDocFromServer(doc(db, "personalDataSessions", currentUser.uid));
        if (!active) return;
        if (existing.exists()) {
          if (!isCompletedSession("data-diri", existing.data(), currentUser.uid)) throw new Error("Data diri perlu diperiksa tim HCGA.");
          setUser(currentUser);
          setView("submitted");
          return;
        }
        await restoreBackup(currentUser.uid, "data-diri");
        if (!active) return;
        const draft = initialDraft(currentUser.uid, profile.data(), currentUser.email);
        formRef.current = draft.form;
        stepRef.current = draft.step;
        setForm(draft.form);
        setStep(draft.step);
        setUser(currentUser);
        setView("form");
      } catch (caughtError) {
        console.error(caughtError);
        if (!active) return;
        setLoadError(caughtError instanceof Error ? caughtError.message : "Data belum dapat dimuat. Periksa koneksi Anda lalu coba kembali.");
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (caughtError) {
      console.error(caughtError);
      setIsSigningOut(false);
    }
  }

  const persist = useCallback(() => {
    if (!user || !formRef.current) return;
    saveBackup(user.uid, "data-diri", { step: stepRef.current, form: formRef.current });
  }, [user]);

  // Bar tombol bawah menempel di layar: saat kolom difokuskan (mis. keyboard HP muncul), browser menggulir
  // kolom itu ke atas bar, bukan di belakangnya.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = "6rem";
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, []);

  // Header meminta simpan draft sebelum pindah ke Beranda (lihat TestHeader).
  useEffect(() => {
    window.addEventListener(SAVE_DATA_DIRI_DRAFT_EVENT, persist);
    return () => window.removeEventListener(SAVE_DATA_DIRI_DRAFT_EVENT, persist);
  }, [persist]);

  const update = useCallback((change: (draft: PersonalDataForm) => void) => {
    if (!formRef.current) return;
    const next = structuredClone(formRef.current);
    change(next);
    formRef.current = next;
    setForm(next);
  }, []);

  function goTo(nextStep: number) {
    stepRef.current = Math.min(Math.max(nextStep, 0), WIZARD_STEPS - 1);
    setStep(stepRef.current);
    persist();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const finalForm = useCallback((current: PersonalDataForm, email: string) => normalizePersonalData({
    ...current,
    identitas: { ...current.identitas, email },
    pernyataan: { ...current.pernyataan, tanggal: todayInJakarta() },
  }), []);
  // Kesalahan selalu dihitung untuk status "Lengkap" di navigasi, tetapi baru ditampilkan setelah "Kirim" pertama.
  const allIssues: PersonalDataIssue[] = useMemo(
    () => (form && user?.email ? personalDataIssues(finalForm(form, user.email)) : []),
    [form, user, finalForm],
  );
  const issues = attempted ? allIssues : [];

  async function submit() {
    if (!user?.email || !formRef.current) return;
    setSubmitError("");
    setAttempted(true);
    const final = finalForm(formRef.current, user.email);
    if (personalDataIssues(final).length > 0) {
      persist();
      return;
    }
    setIsSubmitting(true);
    try {
      await submitAnswers(user.uid, "data-diri", final);
      setView("done");
    } catch (caughtError) {
      console.error(caughtError);
      setSubmitError(caughtError instanceof Error ? caughtError.message : "Penyimpanan belum dapat dikonfirmasi. Tetap di halaman ini dan coba kirim ulang.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <CenteredMessage>
        <div className="max-w-md text-center">
          <p role="alert" className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052f68]">Coba Lagi</button>
        </div>
      </CenteredMessage>
    );
  }

  if (view === "checking" || (view === "form" && !form)) {
    return <CenteredMessage><p className="text-sm font-medium text-slate-500">Menyiapkan formulir...</p></CenteredMessage>;
  }

  if (view === "submitted" || view === "done") {
    return (
      <CenteredMessage>
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_18px_60px_rgba(6,59,130,.09)] sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-primary">{view === "done" ? "Terima kasih." : "Data diri sudah terkirim."}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {view === "done"
              ? "Data diri Anda telah tersimpan. Tim HCGA PT Balancia akan menghubungi Anda untuk proses selanjutnya."
              : "Data diri hanya dapat dikirim satu kali. Hubungi tim HCGA PT Balancia bila ada data yang perlu diperbaiki."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => router.push(HOME_PATH)} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#052f68]">Kembali ke Beranda</button>
            <button type="button" onClick={() => void handleSignOut()} disabled={isSigningOut} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              {isSigningOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </section>
      </CenteredMessage>
    );
  }

  const StepComponent = STEP_COMPONENTS[step];
  const isLast = step === WIZARD_STEPS - 1;
  const issueSteps = Array.from(new Set(issues.map((issue) => issue.step)));
  const stepIssues = issues.filter((issue) => issue.step === step).map((issue) => issue.label);
  const stepStates = wizardStepStates(form!, allIssues);
  const navStatuses: NavStatus[] = stepStates.map((state) =>
    attempted && state.hasIssue ? "error" : state.complete ? "complete" : state.filled ? "partial" : "empty");
  const completeCount = stepStates.filter((state) => state.complete).length;
  const navProps = { step, statuses: navStatuses, completeCount, onSelect: goTo };

  return (
    <main className="pb-28">
      <div ref={topRef} className={DATA_DIRI_WIDTH + " " + DATA_DIRI_COLUMNS + " scroll-mt-4 py-6 sm:py-8 lg:items-start lg:py-10"}>
        <StepSidebar {...navProps} />

        <div className="min-w-0">
          <StepMobileNav {...navProps} />

          <div className="mt-6 lg:mt-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{"Langkah " + (step + 1) + " dari " + WIZARD_STEPS}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{STEP_INFO[step].label}</h1>
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <p className="text-base leading-6 text-slate-500">{STEP_INFO[step].description}</p>
              <p className="shrink-0 text-sm text-slate-500"><span className="font-bold text-red-600">*</span> Wajib diisi</p>
            </div>
          </div>

          {stepIssues.length > 0 && !isLast && (
            <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <p className="text-sm font-bold text-red-800">Langkah ini perlu diperbaiki:</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                {stepIssues.map((label) => <li key={label}>{label}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-6" onBlur={persist}>
            <StepComponent form={form!} update={update} issues={stepIssues} />
          </div>

          {isLast && issues.length > 0 && (
            <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-bold text-red-800">Masih ada isian yang perlu dilengkapi atau diperbaiki:</p>
              <div className="mt-3 space-y-3">
                {issueSteps.map((issueStep) => (
                  <div key={issueStep}>
                    <button type="button" onClick={() => goTo(issueStep)} className="text-sm font-semibold text-red-800 underline">
                      {"Langkah " + (issueStep + 1) + " · " + STEP_INFO[issueStep].label}
                    </button>
                    <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
                      {issues.filter((issue) => issue.step === issueStep).map((issue) => <li key={issue.label}>{issue.label}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          {submitError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{submitError}</p>}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        {/* Desktop: tombol sejajar dengan kolom kanan (kartu langkah); layar sempit: di tengah selebar konten. */}
        <div className={DATA_DIRI_WIDTH + " " + DATA_DIRI_COLUMNS}>
          <div className="flex items-center justify-between gap-3 py-3 lg:col-start-2">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kembali
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={isSubmitting}
                className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#bf4821] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Mengirim..." : "Kirim"}
              </button>
            ) : (
              <button type="button" onClick={() => goTo(step + 1)} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#052f68]">
                Lanjut
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
