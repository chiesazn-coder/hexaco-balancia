"use client";

import { backupKey } from "@/lib/assessment/client";
import { isCompletedSession } from "@/lib/assessment/validation";
import { db } from "@/lib/firebase";
import { ArrowRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { doc, getDocFromServer } from "firebase/firestore";
import { useEffect, useState } from "react";

// Formulir Data Diri: opsional dan bukan bagian dari rangkaian tes (tidak dihitung, tidak bernomor).
export type DataDiriStatus = "not_started" | "draft" | "submitted";

function hasDataDiriDraft(uid: string) {
  try {
    return localStorage.getItem(backupKey(uid, "data-diri")) !== null;
  } catch {
    return false;
  }
}

// Status langsung dari draft di perangkat, lalu diperbarui bila formulir sudah terkirim.
// Pembacaan dimuat terpisah dan tidak pernah menahan halaman; gagal baca = belum diisi.
export function useDataDiriStatus(uid: string | null): DataDiriStatus {
  const [status, setStatus] = useState<DataDiriStatus>("not_started");
  useEffect(() => {
    if (!uid) return;
    let active = true;
    setStatus(hasDataDiriDraft(uid) ? "draft" : "not_started");
    getDocFromServer(doc(db, "personalDataSessions", uid))
      .then((snapshot) => {
        if (active && isCompletedSession("data-diri", snapshot.data(), uid)) setStatus("submitted");
      })
      .catch((readError) => console.error(readError));
    return () => {
      active = false;
    };
  }, [uid]);
  return status;
}

export default function DataDiriCard({ status, onOpen }: { status: DataDiriStatus; onOpen: () => void }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border-2 border-dashed border-[#d9d2c3] bg-white/60 px-7 py-6">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-primary"><DocumentTextIcon className="h-6 w-6" aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data Diri Calon Karyawan</h2>
          <p className="text-sm text-slate-500">Opsional · dapat diisi kapan saja</p>
        </div>
      </div>
      {status === "submitted" ? (
        <span className="rounded-full bg-[#e7f1ea] px-4 py-1.5 text-sm font-bold text-[#3d7a4f]">Sudah terkirim</span>
      ) : (
        <button type="button" onClick={onOpen} className="flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-100">
          {status === "draft" ? "Lanjutkan Mengisi" : "Lengkapi Data Diri"}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
