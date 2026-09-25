"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Dialog konfirmasi bergaya aplikasi (pengganti window.confirm). Fokus awal di tombol batal agar
// Enter tidak langsung menjalankan aksi; Escape atau klik di luar untuk menutup.
export default function ConfirmDialog({ icon, title, message, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-5 backdrop-blur-[2px]" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_24px_70px_rgba(6,59,130,.22)] sm:p-8"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fdf0ea] text-accent" aria-hidden="true">{icon}</div>
        <h2 id="confirm-dialog-title" className="mt-5 text-xl font-bold tracking-tight text-primary">{title}</h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
          <button ref={cancelButtonRef} type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-[#bf4821] focus:outline-none focus:ring-4 focus:ring-orange-100">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
