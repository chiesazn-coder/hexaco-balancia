"use client";

import { auth } from "@/lib/firebase";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { signOut } from "firebase/auth";
import { useEffect } from "react";

export default function ThankYouPage() {
  useEffect(() => {
    void signOut(auth).catch(() => undefined);
  }, []);

  return (
    <main className="grid min-h-[calc(100vh-65px)] place-items-center bg-[#f0ede8] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(44,50,60,.10)] sm:p-12">
        <CheckCircleIcon className="mx-auto h-20 w-20 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-primary">Terima Kasih!</h1>
        <p className="mt-5 leading-7 text-slate-600">Jawaban Anda telah berhasil disimpan. Tim HCGA PT Balancia akan menghubungi Anda untuk proses selanjutnya.</p>
        <p className="mt-8 text-sm text-slate-500">Anda dapat menutup halaman ini.</p>
      </section>
    </main>
  );
}
