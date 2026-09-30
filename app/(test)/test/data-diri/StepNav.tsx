"use client";

import { CheckIcon, ChevronDownIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { WIZARD_STEPS } from "@/lib/assessment/personal-data";

// Nama pendek langkah untuk navigasi dan judul halaman, beserta keterangan satu baris.
export const STEP_INFO = [
  { label: "Identitas Diri", description: "Isi sesuai KTP. Beberapa kolom sudah terisi dari profil Anda; periksa dan ubah bila berbeda." },
  { label: "Keluarga", description: "Data pasangan, anak, orang tua, saudara kandung, dan lingkungan tempat tinggal." },
  { label: "Pendidikan", description: "Riwayat sekolah, kursus, dan kemampuan bahasa asing." },
  { label: "Pekerjaan", description: "Pengalaman kerja dan tanggung jawab Anda sebelumnya." },
  { label: "Referensi", description: "Orang yang dapat memberi keterangan tentang Anda." },
  { label: "Minat", description: "Jabatan yang Anda tuju, lingkungan kerja yang disukai, dan gambaran diri." },
  { label: "Kegiatan Sosial", description: "Hobi, organisasi, serta kekuatan dan kelemahan Anda." },
  { label: "Intern", description: "Harapan kerja dan kesediaan penempatan." },
  { label: "Lain-lain & Pernyataan", description: "Kesehatan, reputasi, dan pernyataan kebenaran data sebelum dikirim." },
] as const;

// "error" hanya dipakai setelah "Kirim" pertama; "partial" = sudah ada isian tetapi belum lengkap.
export type NavStatus = "active" | "complete" | "error" | "partial" | "empty";

const STATUS_TEXT: Record<NavStatus, string> = {
  active: "Sedang diisi",
  complete: "Lengkap",
  error: "Perlu diperbaiki",
  partial: "Belum lengkap",
  empty: "Belum diisi",
};

const NOTE = "Langkah boleh dilewati dan dilengkapi nanti. Semua kolom wajib diperiksa saat Anda menekan Kirim.";

type NavProps = { step: number; statuses: NavStatus[]; completeCount: number; onSelect: (step: number) => void };

function ProgressBar({ completeCount }: { completeCount: number }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={WIZARD_STEPS}
      aria-valuenow={completeCount}
      aria-label={completeCount + " dari " + WIZARD_STEPS + " langkah lengkap"}
    >
      <div className="h-full min-w-2 rounded-full bg-primary transition-all" style={{ width: (completeCount / WIZARD_STEPS) * 100 + "%" }} />
    </div>
  );
}

function StepCircle({ index, status }: { index: number; status: NavStatus }) {
  const base = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold";
  if (status === "active") return <span className={base + " bg-primary text-white"}>{index + 1}</span>;
  if (status === "complete") return <span className={base + " bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500"}><CheckIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /></span>;
  if (status === "error") return <span className={base + " bg-red-50 text-red-600 ring-2 ring-red-500"}><ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" /></span>;
  return <span className={base + " text-slate-500 ring-2 ring-slate-300"}>{index + 1}</span>;
}

function StepList({ step, statuses, onSelect }: Omit<NavProps, "completeCount">) {
  return (
    <ol className="space-y-1">
      {STEP_INFO.map((item, index) => {
        const current = index === step;
        // Langkah aktif yang bermasalah tetap disorot, tetapi keterangannya "Perlu diperbaiki".
        const status = statuses[index];
        const text = current && status !== "error" ? STATUS_TEXT.active : STATUS_TEXT[status];
        return (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={current ? "step" : undefined}
              className={"flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 " + (current ? "bg-blue-50" : "hover:bg-slate-50")}
            >
              <StepCircle index={index} status={current && status !== "error" ? "active" : status} />
              <span className="min-w-0">
                <span className={"block truncate text-[15px] font-bold " + (current ? "text-primary" : "text-slate-900")}>{item.label}</span>
                <span className={"block text-sm " + (status === "error" ? "font-medium text-red-600" : status === "complete" && !current ? "text-emerald-700" : "text-slate-500")}>{text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// Desktop (>= 1024px): kartu samping yang menempel saat halaman digulir.
export function StepSidebar({ step, statuses, completeCount, onSelect }: NavProps) {
  return (
    <aside className="hidden lg:block">
      <nav aria-label="Langkah formulir" className="sticky top-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_12px_32px_rgba(15,23,42,.05)]">
        <h2 className="text-lg font-bold text-slate-900">Data Diri Calon Karyawan</h2>
        <p className="mt-1 text-sm text-slate-500">{completeCount + " dari " + WIZARD_STEPS + " langkah lengkap"}</p>
        <div className="mt-4"><ProgressBar completeCount={completeCount} /></div>
        <div className="-mx-3 mt-5"><StepList step={step} statuses={statuses} onSelect={onSelect} /></div>
        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">{NOTE}</p>
      </nav>
    </aside>
  );
}

// Layar sempit (< 1024px): ringkasan langkah + daftar langkah dalam bottom sheet.
export function StepMobileNav({ step, statuses, completeCount, onSelect }: NavProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold text-slate-800">
          {"Langkah " + (step + 1) + " dari " + WIZARD_STEPS}
          <span className="font-normal text-slate-500">{" · " + STEP_INFO[step].label}</span>
        </p>
        <div className="mt-3"><ProgressBar completeCount={completeCount} /></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-xs text-slate-500">{completeCount + " dari " + WIZARD_STEPS + " langkah lengkap"}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 px-3.5 text-sm font-semibold text-primary transition hover:bg-slate-50"
          >
            Lihat semua langkah
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end" role="dialog" aria-modal="true" aria-labelledby="daftar-langkah-judul">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative max-h-[85vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden="true" />
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 id="daftar-langkah-judul" className="text-base font-bold text-slate-900">Data Diri Calon Karyawan</h2>
                <p className="text-sm text-slate-500">{completeCount + " dari " + WIZARD_STEPS + " langkah lengkap"}</p>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Tutup daftar langkah" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <StepList step={step} statuses={statuses} onSelect={(index) => { setOpen(false); onSelect(index); }} />
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">{NOTE}</p>
          </div>
        </div>
      )}
    </div>
  );
}
